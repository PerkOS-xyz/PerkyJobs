// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title PerkyReputation
 * @notice Soulbound (non-transferable) reputation NFT for PerkyJobs
 * @dev Inspired by ERC-8004 — each user gets ONE token with a dynamic reputation score.
 *      The NFT metadata updates on-chain as reputation changes.
 *      Only the contract owner (PerkyJobs agent) can mint and update scores.
 */
contract PerkyReputation is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;

    // tokenId → reputation score
    mapping(uint256 => uint256) public reputationScore;
    // tokenId → jobs completed count
    mapping(uint256 => uint256) public jobsCompleted;
    // tokenId → jobs posted count
    mapping(uint256 => uint256) public jobsPosted;
    // tokenId → Self Protocol verified
    mapping(uint256 => bool) public selfVerified;
    // address → tokenId (one per address)
    mapping(address => uint256) public tokenOfOwner;
    // address → has token
    mapping(address => bool) public hasToken;

    event ReputationUpdated(uint256 indexed tokenId, address indexed user, uint256 newScore, string reason);
    event SelfVerified(uint256 indexed tokenId, address indexed user);
    event JobCompleted(uint256 indexed tokenId, address indexed user, uint256 totalJobs);
    event JobPosted(uint256 indexed tokenId, address indexed user, uint256 totalJobs);

    constructor() ERC721("PerkyJobs Reputation", "PERKY-REP") Ownable(msg.sender) {
        _nextTokenId = 1; // Start at 1
    }

    /**
     * @notice Mint a reputation NFT for a user. One per address.
     */
    function mint(address to) external onlyOwner returns (uint256) {
        require(!hasToken[to], "Already has reputation token");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        tokenOfOwner[to] = tokenId;
        hasToken[to] = true;
        reputationScore[tokenId] = 0;

        return tokenId;
    }

    /**
     * @notice Add reputation points for completing a job
     */
    function recordJobCompleted(address user, uint256 points) external onlyOwner {
        require(hasToken[user], "No reputation token");
        uint256 tokenId = tokenOfOwner[user];

        jobsCompleted[tokenId]++;
        reputationScore[tokenId] += points;

        emit JobCompleted(tokenId, user, jobsCompleted[tokenId]);
        emit ReputationUpdated(tokenId, user, reputationScore[tokenId], "job_completed");
    }

    /**
     * @notice Record a job posted by user
     */
    function recordJobPosted(address user, uint256 points) external onlyOwner {
        require(hasToken[user], "No reputation token");
        uint256 tokenId = tokenOfOwner[user];

        jobsPosted[tokenId]++;
        reputationScore[tokenId] += points;

        emit JobPosted(tokenId, user, jobsPosted[tokenId]);
        emit ReputationUpdated(tokenId, user, reputationScore[tokenId], "job_posted");
    }

    /**
     * @notice Mark user as Self Protocol verified
     */
    function setSelfVerified(address user) external onlyOwner {
        require(hasToken[user], "No reputation token");
        uint256 tokenId = tokenOfOwner[user];

        selfVerified[tokenId] = true;
        reputationScore[tokenId] += 50; // Bonus for verification

        emit SelfVerified(tokenId, user);
        emit ReputationUpdated(tokenId, user, reputationScore[tokenId], "self_verified");
    }

    /**
     * @notice Get full profile for a user
     */
    function getProfile(address user) external view returns (
        uint256 tokenId,
        uint256 score,
        uint256 completed,
        uint256 posted,
        bool verified
    ) {
        require(hasToken[user], "No reputation token");
        tokenId = tokenOfOwner[user];
        score = reputationScore[tokenId];
        completed = jobsCompleted[tokenId];
        posted = jobsPosted[tokenId];
        verified = selfVerified[tokenId];
    }

    /**
     * @notice Dynamic on-chain SVG metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        address owner = ownerOf(tokenId);
        uint256 score = reputationScore[tokenId];
        uint256 completed = jobsCompleted[tokenId];
        uint256 posted = jobsPosted[tokenId];
        bool verified = selfVerified[tokenId];

        string memory tier = _getTier(score);
        string memory color = _getTierColor(score);
        string memory verifiedBadge = verified ? unicode"✓ Verified" : "Unverified";

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<rect width="400" height="400" rx="20" fill="#1a1a2e"/>',
            '<text x="200" y="50" text-anchor="middle" fill="#35D07F" font-size="24" font-weight="bold">PerkyJobs</text>',
            '<text x="200" y="80" text-anchor="middle" fill="', color, '" font-size="18">', tier, '</text>',
            '<text x="200" y="180" text-anchor="middle" fill="white" font-size="64" font-weight="bold">', score.toString(), '</text>',
            '<text x="200" y="210" text-anchor="middle" fill="#888" font-size="14">Reputation Score</text>',
            '<text x="200" y="260" text-anchor="middle" fill="#aaa" font-size="14">Jobs Completed: ', completed.toString(), '</text>',
            '<text x="200" y="285" text-anchor="middle" fill="#aaa" font-size="14">Jobs Posted: ', posted.toString(), '</text>',
            '<text x="200" y="320" text-anchor="middle" fill="', verified ? '#35D07F' : '#666', '" font-size="14">', verifiedBadge, '</text>',
            '</svg>'
        ));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name":"PerkyJobs Rep #', tokenId.toString(),
            '","description":"Soulbound reputation token for PerkyJobs marketplace on Celo"',
            ',"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)),
            '","attributes":[',
            '{"trait_type":"Reputation Score","value":', score.toString(), '},',
            '{"trait_type":"Tier","value":"', tier, '"},',
            '{"trait_type":"Jobs Completed","value":', completed.toString(), '},',
            '{"trait_type":"Jobs Posted","value":', posted.toString(), '},',
            '{"trait_type":"Self Verified","value":"', verified ? 'true' : 'false', '"}',
            ']}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev SOULBOUND: Prevent all transfers except minting
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)), block transfers
        require(from == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }

    function _getTier(uint256 score) internal pure returns (string memory) {
        if (score >= 500) return "Diamond";
        if (score >= 200) return "Gold";
        if (score >= 50) return "Silver";
        return "Bronze";
    }

    function _getTierColor(uint256 score) internal pure returns (string memory) {
        if (score >= 500) return "#b9f2ff";
        if (score >= 200) return "#FBCC5C";
        if (score >= 50) return "#C0C0C0";
        return "#CD7F32";
    }
}
