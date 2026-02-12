// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PerkyJobsRegistry
 * @notice On-chain registry of jobs for PerkyJobs marketplace
 * @dev Lightweight registry — full job data lives in Firestore, 
 *      this tracks job hashes + payment status for verifiability.
 */
contract PerkyJobsRegistry is Ownable {

    enum JobStatus { Open, Claimed, Delivered, Approved, Paid, Disputed }

    struct Job {
        bytes32 jobHash;       // keccak256 of off-chain job data
        address poster;
        address worker;
        uint256 rewardAmount;  // in USDC atomic units (6 decimals)
        JobStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        bytes32 paymentTxHash; // x402 settlement tx hash
    }

    // jobId (matches Firestore doc ID hash) → Job
    mapping(bytes32 => Job) public jobs;
    // Track all job IDs
    bytes32[] public jobIds;
    // Stats
    uint256 public totalJobs;
    uint256 public totalPaid; // Total USDC paid out (atomic units)

    event JobCreated(bytes32 indexed jobId, address indexed poster, uint256 rewardAmount);
    event JobClaimed(bytes32 indexed jobId, address indexed worker);
    event JobDelivered(bytes32 indexed jobId, address indexed worker);
    event JobApproved(bytes32 indexed jobId, address indexed poster);
    event JobPaid(bytes32 indexed jobId, address indexed worker, uint256 amount, bytes32 txHash);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new job on-chain
     * @param jobId Unique job identifier (hash of Firestore doc ID)
     * @param jobHash Hash of full job data for integrity verification
     * @param poster Address of job poster
     * @param rewardAmount Reward in USDC atomic units
     */
    function createJob(
        bytes32 jobId,
        bytes32 jobHash,
        address poster,
        uint256 rewardAmount
    ) external onlyOwner {
        require(jobs[jobId].createdAt == 0, "Job already exists");

        jobs[jobId] = Job({
            jobHash: jobHash,
            poster: poster,
            worker: address(0),
            rewardAmount: rewardAmount,
            status: JobStatus.Open,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            paymentTxHash: bytes32(0)
        });

        jobIds.push(jobId);
        totalJobs++;

        emit JobCreated(jobId, poster, rewardAmount);
    }

    function claimJob(bytes32 jobId, address worker) external onlyOwner {
        Job storage job = jobs[jobId];
        require(job.createdAt != 0, "Job not found");
        require(job.status == JobStatus.Open, "Not open");

        job.worker = worker;
        job.status = JobStatus.Claimed;
        job.updatedAt = block.timestamp;

        emit JobClaimed(jobId, worker);
    }

    function deliverJob(bytes32 jobId) external onlyOwner {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Claimed, "Not claimed");

        job.status = JobStatus.Delivered;
        job.updatedAt = block.timestamp;

        emit JobDelivered(jobId, job.worker);
    }

    function approveJob(bytes32 jobId) external onlyOwner {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Delivered, "Not delivered");

        job.status = JobStatus.Approved;
        job.updatedAt = block.timestamp;

        emit JobApproved(jobId, job.poster);
    }

    function recordPayment(bytes32 jobId, bytes32 txHash) external onlyOwner {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Approved, "Not approved");

        job.status = JobStatus.Paid;
        job.paymentTxHash = txHash;
        job.updatedAt = block.timestamp;
        totalPaid += job.rewardAmount;

        emit JobPaid(jobId, job.worker, job.rewardAmount, txHash);
    }

    /**
     * @notice Get job count
     */
    function getJobCount() external view returns (uint256) {
        return jobIds.length;
    }

    /**
     * @notice Verify job data integrity
     */
    function verifyJobHash(bytes32 jobId, bytes32 expectedHash) external view returns (bool) {
        return jobs[jobId].jobHash == expectedHash;
    }
}
