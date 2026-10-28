// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AchievementBadges
 * @dev ERC-1155 tokens representing verifiable game achievements.
 */
contract AchievementBadges is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant BADGE_FIRST_WIN = 1;
    uint256 public constant BADGE_HOT_STREAK = 2;
    uint256 public constant BADGE_PERFECT_GAME = 3;
    uint256 public constant BADGE_MINE_DODGER = 4;
    uint256 public constant BADGE_ADMIRAL = 5;

    event BadgeAwarded(address indexed player, uint256 indexed badgeId);

    error BadgeAlreadyEarned(address player, uint256 badgeId);
    error InvalidBadgeId(uint256 badgeId);
    error ZeroAddress();

    constructor(string memory uri_, address admin, address initialMinter) ERC1155(uri_) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (initialMinter != address(0)) {
            _grantRole(MINTER_ROLE, initialMinter);
        }
    }

    /**
     * @notice Mint an achievement badge to a player.
     * Prevents duplicate minting of the same badge to the same player.
     */
    function mintBadge(address player, uint256 badgeId) external onlyRole(MINTER_ROLE) {
        if (player == address(0)) revert ZeroAddress();
        if (badgeId < BADGE_FIRST_WIN || badgeId > BADGE_ADMIRAL) {
            revert InvalidBadgeId(badgeId);
        }
        if (balanceOf(player, badgeId) > 0) {
            revert BadgeAlreadyEarned(player, badgeId);
        }

        _mint(player, badgeId, 1, "");
        emit BadgeAwarded(player, badgeId);
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
