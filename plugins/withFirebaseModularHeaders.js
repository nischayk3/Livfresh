const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Idempotent Config plugin for Expo SDK 54 + Firebase.
 * Fixes "declaration of RCTBridgeModule must be imported" and modularity issues.
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

            const surgicalFix = `
    ${markerStart}
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase')
        target.build_configurations.each do |config|
          config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited) '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/React" '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/React/Base" '
          config.build_settings['HEADER_SEARCH_PATHS'] << '"$(SRCROOT)/../node_modules/react-native/Libraries" '
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

            // 1. Remove ANY existing version of our fix (with or without markers)
            // Remove marked version
            const markedRegex = new RegExp(`${markerStart}.*?${markerEnd}`, 'gs');
            podfileContent = podfileContent.replace(markedRegex, '');

            // Remove the old unmarked aggressive version if it leaked in
            // This is the bit that was likely causing the double 'end'
            podfileContent = podfileContent.replace(/installer\.pods_project\.targets\.each do \|target\|.*?end\s+end/s, '');

            // 2. Clear out the mess: remove stray 'end' lines if they are redundant
            // Specifically look for the 'end end' pattern that caused the failure
            podfileContent = podfileContent.replace(/\n\s*end\n\s*end\n\s*end\n/g, '\n      end\n    end\n');

            // 3. Inject surgically into post_install
            const postInstallMatch = podfileContent.match(/post_install\s+do\s+\|installer\|/);
            if (postInstallMatch) {
                podfileContent = podfileContent.replace(
                    /post_install\s+do\s+\|installer\|/,
                    `post_install do |installer|${surgicalFix}`
                );
            } else {
                podfileContent += `\npost_install do |installer|${surgicalFix}\nend\n`;
            }

            fs.writeFileSync(podfilePath, podfileContent);
            console.log('✅ Applied idempotent surgical header fixes');
            return config;
        },
    ]);
};
