const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Config plugin for Expo SDK 54 + Firebase.
 * Fixes massive compilation errors by:
 * 1. Enabling global modular headers.
 * 2. Relaxing modularity for all pods.
 * 3. Ensuring all pods define modules correctly for Swift interop.
 */
module.exports = function withFirebaseModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
            if (!fs.existsSync(podfilePath)) return config;

            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            // 1. Ensure global modular headers (Crucial for SDK 54 + Static Frameworks)
            if (!podfileContent.includes('use_modular_headers!')) {
                // Add after the platform line
                podfileContent = podfileContent.replace(
                    /platform :ios, .*/,
                    (match) => `${match}\nuse_modular_headers!`
                );
                console.log('✅ Added use_modular_headers! to Podfile');
            }

            // 2. Refined post_install hook for SDK 54
            const modularHeadersFix = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Allow non-modular includes for legacy compatibility
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        # Force define module for Swift/Header internal visibility
        config.build_settings['DEFINES_MODULE'] = 'YES'
      end
    end`;

            // Check if our fix is already inside the post_install block
            if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
                const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);

                if (postInstallMatch) {
                    // Splice our fix into the existing block
                    podfileContent = podfileContent.replace(
                        /post_install\s+do\s+\|installer\|/,
                        `post_install do |installer|${modularHeadersFix}`
                    );
                    console.log('✅ Updated existing post_install with modular header fixes');
                } else {
                    // Append new block
                    podfileContent += `\npost_install do |installer|${modularHeadersFix}\nend\n`;
                    console.log('✅ Created new post_install with modular header fixes');
                }
            }

            fs.writeFileSync(podfilePath, podfileContent);
            return config;
        },
    ]);
};
