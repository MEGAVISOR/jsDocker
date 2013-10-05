var path = require("path");
var doc = require("./index.js");

var config = {
    path            : process.argv[2],
    buildConfigName : 'build.js'
};

if ( !config.path ) {
    console.log('ERROR: Project path is missed...');
    process.exit(1);
}

var buildConfig,
    buildConfigPath = path.join(config.path,config.buildConfigName);

// пытаемся собрать документацию
console.log('Build docs now!');

var fs = require('fs');
if ( fs.existsSync(buildConfigPath) ){
    try {
        buildConfig = require(buildConfigPath).cfg;
        doc({ paths:buildConfig.docs });
    } catch ( e ) {
        console.log('Some problems with "' + buildConfigPath + '" is missed...');
        console.log('Details:');
        console.log(e);
        console.log(e.stack);
        process.exit(3);
    }
} else {
    doc({ paths:[config.path] });
}

