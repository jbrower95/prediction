// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title Prediction
 * @dev A contract for storing and revealing prediction hashes
 *
 * This contract allows users to:
 * 1. Submit hashed predictions (submit)
 * 2. Reveal prediction content with proof (reveal)
 * 3. Query prediction history for any address
 */
contract Prediction {
    // Represents the state of a single prediction
    struct PredictionData {
        bytes32 hash;        // Hash of the prediction content
        uint256 timestamp;   // When the prediction was submitted
        string content;      // Revealed prediction content (empty until revealed)
        bool revealed;       // Whether the prediction has been revealed
        uint256 revealTime;  // When the prediction was revealed (0 until revealed)
    }

    // Mapping from user address to array of their predictions
    mapping(address => PredictionData[]) private predictions;
    
    // Events
    event PredictionSubmitted(address indexed user, bytes32 hash, uint256 timestamp, uint256 index);
    event PredictionRevealed(address indexed user, bytes32 hash, string content, uint256 revealTime, uint256 index);

    /**
     * @dev Submit a new prediction hash
     * @param hash The keccak256 hash of the prediction content
     */
    function submit(bytes32 hash) external {
        require(hash != bytes32(0), "Hash cannot be empty");
        
        predictions[msg.sender].push(PredictionData({
            hash: hash,
            timestamp: block.timestamp,
            content: "",
            revealed: false,
            revealTime: 0
        }));
        
        emit PredictionSubmitted(msg.sender, hash, block.timestamp, predictions[msg.sender].length - 1);
    }
    
    /**
     * @dev Reveal a prediction by providing the original content
     * @param index The index of the prediction to reveal
     * @param content The original prediction content
     * @param salt Optional salt that was used when hashing
     */
    function reveal(uint256 index, string calldata content, string calldata salt) external {
        require(index < predictions[msg.sender].length, "Invalid prediction index");
        require(!predictions[msg.sender][index].revealed, "Prediction already revealed");
        require(bytes(content).length > 0, "Content cannot be empty");
        
        // Recreate the hash to verify authenticity
        bytes32 contentHash;
        if (bytes(salt).length > 0) {
            // If salt was provided, include it in hash calculation
            contentHash = keccak256(abi.encodePacked(content, " (salt: ", salt, ")"));
        } else {
            contentHash = keccak256(abi.encodePacked(content));
        }
        
        require(contentHash == predictions[msg.sender][index].hash, "Content does not match hash");
        
        // Update the prediction with revealed content
        predictions[msg.sender][index].content = content;
        predictions[msg.sender][index].revealed = true;
        predictions[msg.sender][index].revealTime = block.timestamp;
        
        emit PredictionRevealed(
            msg.sender, 
            predictions[msg.sender][index].hash, 
            content, 
            block.timestamp, 
            index
        );
    }
    
    /**
     * @dev Get the number of predictions made by a user
     * @param user The address to query
     * @return The number of predictions made by the user
     */
    function getPredictionCount(address user) external view returns (uint256) {
        return predictions[user].length;
    }
    
    /**
     * @dev Get a specific prediction by index
     * @param user The address of the prediction maker
     * @param index The index of the prediction to retrieve
     * @return hash The hash of the prediction
     * @return timestamp The time when the prediction was submitted
     * @return content The revealed content (empty if not revealed)
     * @return revealed Whether the prediction has been revealed
     * @return revealTime The time when the prediction was revealed (0 if not revealed)
     */
    function getPrediction(address user, uint256 index) external view returns (
        bytes32 hash,
        uint256 timestamp,
        string memory content,
        bool revealed,
        uint256 revealTime
    ) {
        require(index < predictions[user].length, "Invalid prediction index");
        
        PredictionData storage pred = predictions[user][index];
        return (
            pred.hash,
            pred.timestamp,
            pred.content,
            pred.revealed,
            pred.revealTime
        );
    }
    
    /**
     * @dev Get all predictions for a user
     * @param user The address to query
     * @return hashes Array of prediction hashes
     * @return timestamps Array of submission timestamps
     * @return contents Array of revealed contents (empty strings for unrevealed predictions)
     * @return revealedStates Array of boolean flags indicating whether each prediction is revealed
     * @return revealTimes Array of reveal timestamps (0 for unrevealed predictions)
     */
    function getAllPredictions(address user) external view returns (
        bytes32[] memory hashes,
        uint256[] memory timestamps,
        string[] memory contents,
        bool[] memory revealedStates,
        uint256[] memory revealTimes
    ) {
        uint256 count = predictions[user].length;
        
        hashes = new bytes32[](count);
        timestamps = new uint256[](count);
        contents = new string[](count);
        revealedStates = new bool[](count);
        revealTimes = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            PredictionData storage pred = predictions[user][i];
            hashes[i] = pred.hash;
            timestamps[i] = pred.timestamp;
            contents[i] = pred.content;
            revealedStates[i] = pred.revealed;
            revealTimes[i] = pred.revealTime;
        }
        
        return (hashes, timestamps, contents, revealedStates, revealTimes);
    }
    
    /**
     * @dev Verify if a prediction hash exists and get its timestamp
     * @param user The address of the prediction maker
     * @param hash The hash to verify
     * @return exists Whether the hash exists
     * @return timestamp When the prediction was made (0 if doesn't exist)
     * @return revealed Whether the prediction has been revealed
     * @return index The index of the prediction (-1 if doesn't exist)
     */
    function verifyPrediction(address user, bytes32 hash) external view returns (
        bool exists,
        uint256 timestamp,
        bool revealed,
        int256 index
    ) {
        for (uint256 i = 0; i < predictions[user].length; i++) {
            if (predictions[user][i].hash == hash) {
                return (
                    true, 
                    predictions[user][i].timestamp,
                    predictions[user][i].revealed,
                    int256(i)
                );
            }
        }
        
        return (false, 0, false, -1);
    }
}