const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Surgical Config plugin for Expo SDK 54 + Firebase.
 * Fixes "declaration of RCTBridgeModule must be imported" by:
 * 1. Adding explicit Header Search Paths for React to RNFB targets.
 * 2. Relaxing modularity specifically for Firebase pods.
 */
module.exports = function withFirebaseModularHeaders(config) {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
            if (!fs.existsSync(podfilePath)) return config;

            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            // 1. We'll use a more refined post_install hook
            const surgicalFix = `
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          # Fix for "declaration of RCTBridgeModule must be imported"
          config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited) '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/React" '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/React/Base" '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/Libraries" '
          
          # Modularity relaxations
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'YES'
          
          # Preprocessor fixes for Firestore
          if target.name.include?('Firestore')
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= '$(inherited) '
            config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'GPB_USE_PROTOBUF_FRAMEWORK_IMPORTS=1 '
          end
        end
      end
    end`;

            // Remove the old aggressive fix if present
            podfileContent = podfileContent.replace(/installer\.pods_project\.targets\.each do \|target\|.*?end\s+end/s, surgicalFix);

            // Also ensure use_modular_headers! is NOT global as it can conflict with static frameworks in SDK 54
            // podfileContent = podfileContent.replace(/use_modular_headers!\n/g, ''); 

            if (!podfileContent.includes('HEADER_SEARCH_PATHS')) {
                const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);

                if (postInstallMatch) {
                    podfileContent = podfileContent.replace(
                        /post_install\s+do\s+\|installer\|/,
                        `post_install do |installer|${surgicalFix}`
                    );
                } else {
                    podfileContent += `\npost_install do |installer|${surgicalFix}\nend\n`;
                }
            }

            fs.writeFileSync(podfilePath, podfileContent);
            console.log('✅ Applied surgical header fixes for RNFB targets');
            return config;
        },
    ]);
};
