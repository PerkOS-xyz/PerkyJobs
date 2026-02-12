// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {PerkyReputation} from "../src/PerkyReputation.sol";

contract PerkyReputationTest is Test {
    PerkyReputation rep;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        rep = new PerkyReputation();
    }

    function test_mint() public {
        uint256 tokenId = rep.mint(alice);
        assertEq(tokenId, 1);
        assertTrue(rep.hasToken(alice));
        assertEq(rep.reputationScore(tokenId), 0);
    }

    function test_cannotMintTwice() public {
        rep.mint(alice);
        vm.expectRevert("Already has reputation token");
        rep.mint(alice);
    }

    function test_jobCompleted() public {
        rep.mint(alice);
        rep.recordJobCompleted(alice, 10);
        (,uint256 score, uint256 completed,,) = rep.getProfile(alice);
        assertEq(score, 10);
        assertEq(completed, 1);
    }

    function test_selfVerified() public {
        rep.mint(alice);
        rep.setSelfVerified(alice);
        (,uint256 score,,, bool verified) = rep.getProfile(alice);
        assertEq(score, 50);
        assertTrue(verified);
    }

    function test_soulbound() public {
        rep.mint(alice);
        uint256 tokenId = rep.tokenOfOwner(alice);
        vm.prank(alice);
        vm.expectRevert("Soulbound: non-transferable");
        rep.transferFrom(alice, bob, tokenId);
    }

    function test_tokenURI() public {
        rep.mint(alice);
        rep.recordJobCompleted(alice, 10);
        string memory uri = rep.tokenURI(1);
        assertTrue(bytes(uri).length > 0);
    }
}
