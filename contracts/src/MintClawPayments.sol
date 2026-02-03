// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MintClawPayments
 * @notice The Stripe for AI Agents - enables agent-to-agent payments
 * @dev Supports instant payments, escrow, and streaming payments
 */
contract MintClawPayments is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STATE ============

    IERC20 public immutable usdc;
    address public feeRecipient;
    uint256 public protocolFeeBps = 250; // 2.5%

    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => Stream) public streams;

    uint256 public escrowCount;
    uint256 public streamCount;

    struct Escrow {
        address payer;
        address provider;
        uint256 amount;
        uint256 deadline;
        string jobId;
        EscrowState state;
        uint256 createdAt;
    }

    enum EscrowState { None, Active, Released, Disputed, Refunded }

    struct Stream {
        address payer;
        address recipient;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 maxDuration;
        uint256 totalDeposit;
        uint256 withdrawn;
        bool active;
    }

    // ============ EVENTS ============

    event InstantPayment(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee,
        string memo
    );

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed provider,
        uint256 amount,
        string jobId,
        uint256 deadline
    );

    event EscrowReleased(bytes32 indexed escrowId, uint256 amount, uint256 fee);
    event EscrowRefunded(bytes32 indexed escrowId, uint256 amount);
    event EscrowDisputed(bytes32 indexed escrowId);

    event StreamStarted(
        bytes32 indexed streamId,
        address indexed payer,
        address indexed recipient,
        uint256 ratePerSecond,
        uint256 maxDuration
    );

    event StreamWithdrawn(bytes32 indexed streamId, uint256 amount);
    event StreamStopped(bytes32 indexed streamId, uint256 totalPaid, uint256 refunded);

    // ============ CONSTRUCTOR ============

    constructor(address _usdc, address _feeRecipient) {
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ============ INSTANT PAYMENTS ============

    /**
     * @notice Send instant payment to another agent
     * @param to Recipient address
     * @param amount Amount in USDC (6 decimals)
     * @param memo Optional memo/reference
     */
    function pay(
        address to,
        uint256 amount,
        string calldata memo
    ) external nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 netAmount = amount - fee;

        // Transfer from sender
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Transfer to recipient and fee recipient
        usdc.safeTransfer(to, netAmount);
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        emit InstantPayment(msg.sender, to, netAmount, fee, memo);
    }

    // ============ ESCROW PAYMENTS ============

    /**
     * @notice Create an escrow for a job/task
     * @param provider Agent who will do the work
     * @param amount Amount to lock in escrow
     * @param jobId Unique job identifier
     * @param deadline Timestamp by which work must be done
     */
    function createEscrow(
        address provider,
        uint256 amount,
        string calldata jobId,
        uint256 deadline
    ) external nonReentrant returns (bytes32 escrowId) {
        require(provider != address(0), "Invalid provider");
        require(provider != msg.sender, "Cannot escrow to self");
        require(amount > 0, "Amount must be > 0");
        require(deadline > block.timestamp, "Deadline must be future");

        escrowId = keccak256(abi.encodePacked(msg.sender, provider, jobId, block.timestamp, escrowCount++));
        require(escrows[escrowId].state == EscrowState.None, "Escrow exists");

        // Transfer USDC to contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            provider: provider,
            amount: amount,
            deadline: deadline,
            jobId: jobId,
            state: EscrowState.Active,
            createdAt: block.timestamp
        });

        emit EscrowCreated(escrowId, msg.sender, provider, amount, jobId, deadline);
    }

    /**
     * @notice Release escrow to provider (payer confirms work done)
     * @param escrowId The escrow to release
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Active, "Escrow not active");
        require(msg.sender == escrow.payer, "Only payer can release");

        uint256 fee = (escrow.amount * protocolFeeBps) / 10000;
        uint256 netAmount = escrow.amount - fee;

        escrow.state = EscrowState.Released;

        usdc.safeTransfer(escrow.provider, netAmount);
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        emit EscrowReleased(escrowId, netAmount, fee);
    }

    /**
     * @notice Provider claims escrow after deadline (auto-release)
     * @param escrowId The escrow to claim
     */
    function claimEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Active, "Escrow not active");
        require(msg.sender == escrow.provider, "Only provider can claim");
        require(block.timestamp > escrow.deadline, "Deadline not passed");

        uint256 fee = (escrow.amount * protocolFeeBps) / 10000;
        uint256 netAmount = escrow.amount - fee;

        escrow.state = EscrowState.Released;

        usdc.safeTransfer(escrow.provider, netAmount);
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        emit EscrowReleased(escrowId, netAmount, fee);
    }

    /**
     * @notice Provider voluntarily refunds the escrow
     * @param escrowId The escrow to refund
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Active, "Escrow not active");
        require(msg.sender == escrow.provider, "Only provider can refund");

        escrow.state = EscrowState.Refunded;
        usdc.safeTransfer(escrow.payer, escrow.amount);

        emit EscrowRefunded(escrowId, escrow.amount);
    }

    /**
     * @notice Payer cancels escrow before deadline (if provider agrees or hasn't started)
     * @param escrowId The escrow to cancel
     */
    function cancelEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.state == EscrowState.Active, "Escrow not active");
        require(msg.sender == escrow.payer, "Only payer can cancel");
        // Can only cancel within first 10% of time window
        uint256 gracePeriod = (escrow.deadline - escrow.createdAt) / 10;
        require(block.timestamp <= escrow.createdAt + gracePeriod, "Grace period passed");

        escrow.state = EscrowState.Refunded;
        usdc.safeTransfer(escrow.payer, escrow.amount);

        emit EscrowRefunded(escrowId, escrow.amount);
    }

    // ============ STREAMING PAYMENTS ============

    /**
     * @notice Start a streaming payment (pay per second)
     * @param recipient Who receives the stream
     * @param ratePerSecond USDC per second (6 decimals)
     * @param maxDuration Maximum stream duration in seconds
     */
    function startStream(
        address recipient,
        uint256 ratePerSecond,
        uint256 maxDuration
    ) external nonReentrant returns (bytes32 streamId) {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot stream to self");
        require(ratePerSecond > 0, "Rate must be > 0");
        require(maxDuration > 0, "Duration must be > 0");

        uint256 totalDeposit = ratePerSecond * maxDuration;

        streamId = keccak256(abi.encodePacked(msg.sender, recipient, block.timestamp, streamCount++));
        require(!streams[streamId].active, "Stream exists");

        // Lock full amount
        usdc.safeTransferFrom(msg.sender, address(this), totalDeposit);

        streams[streamId] = Stream({
            payer: msg.sender,
            recipient: recipient,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            maxDuration: maxDuration,
            totalDeposit: totalDeposit,
            withdrawn: 0,
            active: true
        });

        emit StreamStarted(streamId, msg.sender, recipient, ratePerSecond, maxDuration);
    }

    /**
     * @notice Recipient withdraws earned amount from stream
     * @param streamId The stream to withdraw from
     */
    function withdrawFromStream(bytes32 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.active, "Stream not active");
        require(msg.sender == stream.recipient, "Not recipient");

        uint256 withdrawable = _getWithdrawableAmount(stream);
        require(withdrawable > 0, "Nothing to withdraw");

        uint256 fee = (withdrawable * protocolFeeBps) / 10000;
        uint256 netAmount = withdrawable - fee;

        stream.withdrawn += withdrawable;

        usdc.safeTransfer(stream.recipient, netAmount);
        if (fee > 0) {
            usdc.safeTransfer(feeRecipient, fee);
        }

        emit StreamWithdrawn(streamId, netAmount);
    }

    /**
     * @notice Stop a stream (payer or recipient)
     * @param streamId The stream to stop
     */
    function stopStream(bytes32 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.active, "Stream not active");
        require(msg.sender == stream.payer || msg.sender == stream.recipient, "Not authorized");

        uint256 elapsed = block.timestamp - stream.startTime;
        if (elapsed > stream.maxDuration) {
            elapsed = stream.maxDuration;
        }

        uint256 totalEarned = elapsed * stream.ratePerSecond;
        uint256 unpaid = totalEarned - stream.withdrawn;
        uint256 refund = stream.totalDeposit - totalEarned;

        stream.active = false;

        // Pay out remaining to recipient
        if (unpaid > 0) {
            uint256 fee = (unpaid * protocolFeeBps) / 10000;
            uint256 netAmount = unpaid - fee;
            usdc.safeTransfer(stream.recipient, netAmount);
            if (fee > 0) {
                usdc.safeTransfer(feeRecipient, fee);
            }
        }

        // Refund unused to payer
        if (refund > 0) {
            usdc.safeTransfer(stream.payer, refund);
        }

        emit StreamStopped(streamId, totalEarned, refund);
    }

    // ============ VIEW FUNCTIONS ============

    function getEscrow(bytes32 escrowId) external view returns (
        address payer,
        address provider,
        uint256 amount,
        uint256 deadline,
        string memory jobId,
        EscrowState state
    ) {
        Escrow memory e = escrows[escrowId];
        return (e.payer, e.provider, e.amount, e.deadline, e.jobId, e.state);
    }

    function getStreamBalance(bytes32 streamId) external view returns (uint256 withdrawable) {
        Stream memory stream = streams[streamId];
        if (!stream.active) return 0;
        return _getWithdrawableAmount(stream);
    }

    function getStream(bytes32 streamId) external view returns (
        address payer,
        address recipient,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 maxDuration,
        uint256 withdrawn,
        bool active
    ) {
        Stream memory s = streams[streamId];
        return (s.payer, s.recipient, s.ratePerSecond, s.startTime, s.maxDuration, s.withdrawn, s.active);
    }

    // ============ INTERNAL ============

    function _getWithdrawableAmount(Stream memory stream) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - stream.startTime;
        if (elapsed > stream.maxDuration) {
            elapsed = stream.maxDuration;
        }
        uint256 totalEarned = elapsed * stream.ratePerSecond;
        return totalEarned - stream.withdrawn;
    }

    // ============ ADMIN ============

    function setFeeRecipient(address _feeRecipient) external {
        require(msg.sender == feeRecipient, "Not authorized");
        feeRecipient = _feeRecipient;
    }

    function setProtocolFee(uint256 _feeBps) external {
        require(msg.sender == feeRecipient, "Not authorized");
        require(_feeBps <= 1000, "Fee too high"); // Max 10%
        protocolFeeBps = _feeBps;
    }
}
