// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MatchRegistry
 * @dev Records authoritative Battleship match outcomes on-chain asynchronously.
 */
contract MatchRegistry is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct Record {
        address winner;
        bytes32 resultHash;
        uint64 timestamp;
        bool exists;
    }

    // matchId => Record
    mapping(bytes32 => Record) private _records;

    event MatchRecorded(
        bytes32 indexed matchId,
        address indexed winner,
        bytes32 resultHash,
        uint64 timestamp
    );

    error MatchAlreadyRecorded(bytes32 matchId);
    error InvalidResultHash();

    constructor(address admin, address initialRecorder) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (initialRecorder != address(0)) {
            _grantRole(RECORDER_ROLE, initialRecorder);
        }
    }

    /**
     * @notice Record a verified match outcome.
     * @param matchId Deterministic 32-byte identifier for the match.
     * @param winner The winning player's address (or address(0) if draw/forfeit with no winner).
     * @param resultHash Keccak-256 hash of the canonical match record.
     */
    function recordMatch(
        bytes32 matchId,
        address winner,
        bytes32 resultHash
    ) external onlyRole(RECORDER_ROLE) {
        if (_records[matchId].exists) {
            revert MatchAlreadyRecorded(matchId);
        }
        if (resultHash == bytes32(0)) {
            revert InvalidResultHash();
        }

        uint64 currentTime = uint64(block.timestamp);
        _records[matchId] = Record({
            winner: winner,
            resultHash: resultHash,
            timestamp: currentTime,
            exists: true
        });

        emit MatchRecorded(matchId, winner, resultHash, currentTime);
    }

    /**
     * @notice Retrieve a match record by its match ID.
     */
    function getMatch(bytes32 matchId)
        external
        view
        returns (
            address winner,
            bytes32 resultHash,
            uint64 timestamp,
            bool exists
        )
    {
        Record storage r = _records[matchId];
        return (r.winner, r.resultHash, r.timestamp, r.exists);
    }
}
