const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to allow non-modular headers in Firebase targets.
 * This fixes the error: "include of non-modular header inside framework module"
 */
module.exports = function withFirebaseModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
            if (!fs.existsSync(podfilePath)) return config;

            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            const modularHeadersFix = `
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`;

            // Check if the fix is already there
            if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
                // Find the post_install block
                const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);

                if (postInstallMatch) {
                    podfileContent = podfileContent.replace(
                        /post_install\s+do\s+\|installer\|/,
                        `post_install do |installer|${modularHeadersFix}`
                    );
                    console.log('✅ Applied non-modular header fix to Podfile');
                } else {
                    // If no post_install block, append one before the end
                    podfileContent += `\npost_install do |installer|${modularHeadersFix}\nend\n`;
                    console.log('✅ Created post_install block with non-modular header fix');
                }
            }

            fs.writeFileSync(podfilePath, podfileContent);
            return config;
        },
    ]);
};
