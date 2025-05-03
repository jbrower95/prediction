// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/Prediction.sol";

contract PredictionTest is Test {
    Prediction public predictions;
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        predictions = new Prediction();
        vm.label(user1, "User1");
        vm.label(user2, "User2");
    }
    
    function testSubmitPrediction() public {
        string memory content = "Bitcoin will reach $100k by the end of 2025";
        string memory salt = "mysalt123";
        bytes32 hash = keccak256(abi.encodePacked(content, " (salt: ", salt, ")"));
        
        vm.prank(user1);
        predictions.submit(hash);
        
        (bytes32 storedHash, uint256 timestamp, , bool revealed, ) = predictions.getPrediction(user1, 0);
        
        assertEq(storedHash, hash);
        assertEq(revealed, false);
        assertGt(timestamp, 0);
    }
    
    function testRevealPrediction() public {
        string memory content = "Ethereum will flip Bitcoin in 2026";
        string memory salt = "mysecret456";
        bytes32 hash = keccak256(abi.encodePacked(content, " (salt: ", salt, ")"));
        
        vm.startPrank(user1);
        predictions.submit(hash);
        predictions.reveal(0, content, salt);
        vm.stopPrank();
        
        (bytes32 storedHash, , string memory storedContent, bool revealed, uint256 revealTime) 
            = predictions.getPrediction(user1, 0);
        
        assertEq(storedHash, hash);
        assertEq(storedContent, content);
        assertEq(revealed, true);
        assertGt(revealTime, 0);
    }
    
    function testMultipleUserPredictions() public {
        // User 1 predictions
        string memory content1 = "Solana will reach $500";
        string memory salt1 = "salt1";
        bytes32 hash1 = keccak256(abi.encodePacked(content1, " (salt: ", salt1, ")"));
        
        // User 2 predictions
        string memory content2 = "Base will be the #1 L2";
        string memory salt2 = "salt2";
        bytes32 hash2 = keccak256(abi.encodePacked(content2, " (salt: ", salt2, ")"));
        
        // Submit predictions
        vm.prank(user1);
        predictions.submit(hash1);
        
        vm.prank(user2);
        predictions.submit(hash2);
        
        // Verify prediction counts
        assertEq(predictions.getPredictionCount(user1), 1);
        assertEq(predictions.getPredictionCount(user2), 1);
        
        // Reveal user1's prediction
        vm.prank(user1);
        predictions.reveal(0, content1, salt1);
        
        // Check states
        (,, string memory storedContent1, bool revealed1,) = predictions.getPrediction(user1, 0);
        (,,, bool revealed2,) = predictions.getPrediction(user2, 0);
        
        assertEq(storedContent1, content1);
        assertEq(revealed1, true);
        assertEq(revealed2, false);
    }
    
    function testVerifyPrediction() public {
        string memory content = "AI will pass 90% of bar exams by 2027";
        string memory salt = "aitest123";
        bytes32 hash = keccak256(abi.encodePacked(content, " (salt: ", salt, ")"));
        
        vm.prank(user1);
        predictions.submit(hash);
        
        (bool exists, uint256 timestamp, bool revealed, int256 index) = predictions.verifyPrediction(user1, hash);
        
        assertEq(exists, true);
        assertGt(timestamp, 0);
        assertEq(revealed, false);
        assertEq(index, 0);
    }
    
    function testGetAllPredictions() public {
        // Submit multiple predictions
        vm.startPrank(user1);
        
        string memory content1 = "Prediction 1";
        string memory salt1 = "salt1";
        bytes32 hash1 = keccak256(abi.encodePacked(content1, " (salt: ", salt1, ")"));
        predictions.submit(hash1);
        
        string memory content2 = "Prediction 2";
        string memory salt2 = "salt2";
        bytes32 hash2 = keccak256(abi.encodePacked(content2, " (salt: ", salt2, ")"));
        predictions.submit(hash2);
        
        // Reveal one prediction
        predictions.reveal(0, content1, salt1);
        vm.stopPrank();
        
        // Get all predictions
        (
            bytes32[] memory hashes,
            uint256[] memory timestamps,
            string[] memory contents,
            bool[] memory revealedStates,
            uint256[] memory revealTimes
        ) = predictions.getAllPredictions(user1);
        
        // Verify results
        assertEq(hashes.length, 2);
        assertEq(hashes[0], hash1);
        assertEq(hashes[1], hash2);
        assertEq(contents[0], content1);
        assertEq(contents[1], "");
        assertEq(revealedStates[0], true);
        assertEq(revealedStates[1], false);
        assertGt(timestamps[0], 0);
        assertGt(timestamps[1], 0);
        assertGt(revealTimes[0], 0);
        assertEq(revealTimes[1], 0);
    }
    
    function testRevealWithWrongContent() public {
        string memory content = "The correct prediction";
        string memory salt = "salt123";
        bytes32 hash = keccak256(abi.encodePacked(content, " (salt: ", salt, ")"));
        
        vm.startPrank(user1);
        predictions.submit(hash);
        
        // Try to reveal with wrong content
        vm.expectRevert("Content does not match hash");
        predictions.reveal(0, "Wrong content", salt);
        
        // Try to reveal with wrong salt
        vm.expectRevert("Content does not match hash");
        predictions.reveal(0, content, "wrongsalt");
        vm.stopPrank();
    }
    
    function testRevealWithoutSalt() public {
        string memory content = "A prediction without salt";
        bytes32 hash = keccak256(abi.encodePacked(content));
        
        vm.startPrank(user1);
        predictions.submit(hash);
        predictions.reveal(0, content, ""); // empty salt
        vm.stopPrank();
        
        (,, string memory storedContent, bool revealed,) = predictions.getPrediction(user1, 0);
        
        assertEq(storedContent, content);
        assertEq(revealed, true);
    }
}