const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Idempotent Config plugin for Expo SDK 54 + Firebase.
 * Fixes "declaration of RCTBridgeModule must be imported" and modularity issues for iOS.
 */
module.exports = function withFirebaseModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
            if (!fs.existsSync(podfilePath)) return config;

            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            const markerStart = '# START: Firebase Modular Headers Fix';
            const markerEnd = '# END: Firebase Modular Headers Fix';

            // Clean up any existing messes or corrupted markers first
            const markedRegex = new RegExp(`${markerStart}.*?${markerEnd}`, 'gs');
            podfileContent = podfileContent.replace(markedRegex, '');

            // The specific surgical fix needed for Firebase compatibility in Expo 54
            const surgicalFix = `
    ${markerStart}
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'YES'
          if target.name.include?('Firestore')
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= '$(inherited) '
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1 '
          end
        end
      end
    end
    ${markerEnd}`;

            // Inject into the post_install block
            if (podfileContent.includes('post_install do |installer|')) {
                // Remove the fix if it was somehow injected without markers (rare)
                podfileContent = podfileContent.replace(/# START: Firebase Modular Headers Fix[\s\S]*?# END: Firebase Modular Headers Fix/g, '');

                podfileContent = podfileContent.replace(
                    /post_install do \|installer\|/,
                    `post_install do |installer|${surgicalFix}`
                );
            } else {
                podfileContent += `\npost_install do |installer|${surgicalFix}\nend\n`;
            }

            fs.writeFileSync(podfilePath, podfileContent);
            console.log('✅ Applied clean Firebase modular headers fix');
            return config;
        },
    ]);
};
