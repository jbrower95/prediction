// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/Prediction.sol";

contract DeployPrediction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Prediction prediction = new Prediction();
        
        console.log("Prediction contract deployed at:", address(prediction));
        
        vm.stopBroadcast();
    }
}