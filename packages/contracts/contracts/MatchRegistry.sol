// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MatchRegistry
 * @notice Records the result of each finished Battleship match on-chain.
 *         Only an address with the RECORDER_ROLE (the relayer) can write.
 *         Match IDs are UUIDs from the game server — duplicates are rejected.
 */
contract MatchRegistry is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    struct MatchRecord {
        address winner;
        uint256 timestamp;
        bytes32 resultHash;
        bool    exists;
    }

    /// matchId (bytes32 of uuid string) → record
    mapping(bytes32 => MatchRecord) public records;

    event MatchRecorded(
        bytes32 indexed matchId,
        address indexed winner,
        uint256 timestamp,
        bytes32 resultHash
    );

    constructor(address admin, address recorder) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, recorder);
    }

    /**
     * @notice Record a match result. Reverts on duplicate matchId.
     * @param matchId    keccak256 of the UUID string from the server
     * @param winner     winning player's wallet address
     * @param timestamp  unix timestamp when the match ended
     * @param resultHash keccak256 of the canonical match record JSON
     */
    function recordMatch(
        bytes32 matchId,
        address winner,
        uint256 timestamp,
        bytes32 resultHash
    ) external onlyRole(RECORDER_ROLE) {
        require(!records[matchId].exists, "MatchRegistry: duplicate match");
        require(winner != address(0),     "MatchRegistry: zero winner");

        records[matchId] = MatchRecord({
            winner:     winner,
            timestamp:  timestamp,
            resultHash: resultHash,
            exists:     true
        });

        emit MatchRecorded(matchId, winner, timestamp, resultHash);
    }

    /**
     * @notice Verify that a stored result hash matches a recomputed one.
     */
    function verify(bytes32 matchId, bytes32 recomputedHash)
        external
        view
        returns (bool)
    {
        MatchRecord storage r = records[matchId];
        return r.exists && r.resultHash == recomputedHash;
    }

    /**
     * @notice Convenience: get full record for a match.
     */
    function getRecord(bytes32 matchId)
        external
        view
        returns (address winner, uint256 timestamp, bytes32 resultHash, bool exists)
    {
        MatchRecord storage r = records[matchId];
        return (r.winner, r.timestamp, r.resultHash, r.exists);
    }
}
