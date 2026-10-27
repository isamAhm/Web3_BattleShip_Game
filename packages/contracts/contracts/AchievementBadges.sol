// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AchievementBadges
 * @notice ERC-1155 achievement badges for Battle Arena.
 *         Token IDs map to badge types (see BADGE_* constants).
 *         Only the MINTER_ROLE (backend relayer) can mint.
 *         Badges are non-transferable by default (soulbound).
 */
contract AchievementBadges is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Badge token IDs
    uint256 public constant BADGE_FIRST_WIN    = 1;
    uint256 public constant BADGE_HOT_STREAK   = 2;
    uint256 public constant BADGE_PERFECT_GAME = 3;
    uint256 public constant BADGE_MINE_DODGER  = 4;
    uint256 public constant BADGE_ADMIRAL      = 5;

    /// address → tokenId → already minted (one badge per type per player)
    mapping(address => mapping(uint256 => bool)) public hasBadge;

    /// Whether badges are transferable (false = soulbound)
    bool public transferable;

    event BadgeMinted(address indexed player, uint256 indexed badgeId);

    constructor(address admin, address minter, string memory baseUri)
        ERC1155(baseUri)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        transferable = false;
    }

    /**
     * @notice Mint a badge to a player. Reverts if already owned.
     */
    function mintBadge(address player, uint256 badgeId)
        external
        onlyRole(MINTER_ROLE)
    {
        require(badgeId >= 1 && badgeId <= 5, "AchievementBadges: invalid badge");
        require(!hasBadge[player][badgeId],   "AchievementBadges: already owned");

        hasBadge[player][badgeId] = true;
        _mint(player, badgeId, 1, "");

        emit BadgeMinted(player, badgeId);
    }

    /**
     * @notice Batch mint several badges at once.
     */
    function mintBadges(address player, uint256[] calldata badgeIds)
        external
        onlyRole(MINTER_ROLE)
    {
        for (uint256 i = 0; i < badgeIds.length; i++) {
            uint256 id = badgeIds[i];
            require(id >= 1 && id <= 5, "AchievementBadges: invalid badge");
            if (!hasBadge[player][id]) {
                hasBadge[player][id] = true;
                _mint(player, id, 1, "");
                emit BadgeMinted(player, id);
            }
        }
    }

    /**
     * @notice Block transfers if soulbound.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        require(transferable || from == address(0), "AchievementBadges: soulbound");
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        require(transferable || from == address(0), "AchievementBadges: soulbound");
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    /**
     * @notice Admin can enable trading later (e.g. for a marketplace).
     */
    function setTransferable(bool _transferable)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        transferable = _transferable;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
