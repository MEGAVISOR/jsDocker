var program = require('commander');

program
    .version('0.0.1')
    .usage('[options] <paths ...>')
    .option('-J, --json', 'Output json if specified')
    .option('--json_out <path>', 'Json output path')
    .option('-D, --debug <level>', 'debug level = 0..4 where 0 - only critical errors')
    .option('-S, --simple', 'enable Simple mode, then use simple paths')
    .option('-O, --output <path>', 'specify output file path')
    .parse(process.argv);

var path = require('path'),
    fs = require('fs'),
    infilename = program.args,
    // результат сохраним в первую папку которая юыла указана для сборки
    outfiledir = program.output?program.output:path.join(infilename[0],'docs'),
    jsdoctojson = require("./jsdoctojson.js"),
    json_reductor = require("./json_reductor.js");

var wrench = require("wrench");
wrench.mkdirSyncRecursive(outfiledir);

var outfilename = path.join(outfiledir,'doc.html');

infilename.forEach(function(filename,index,arr){
    var tst = filename.slice(-8);
    if ( !program.simple && tst !== 'modules' && tst !== '/modules' && tst !== 'modules/'){
        arr[index] = path.join(filename,'modules');
    }
});


jsdoctojson(infilename,function(json){

    if (program.json){

        var json_file;
        // если не указан явно файл для вывода
        if ( !program.json_out ){
            json_file = path.join(outfiledir,'doc.json')
        } else {
            json_file = program.json_out
        }

        var outStr = JSON.stringify( json, null, 4 );
        wrench.mkdirSyncRecursive(path.dirname( json_file ));
        fs.writeFileSync(json_file,outStr);
    }

    json_reductor(json,outfilename);
},{
    skipErrCodes:{
        '1':true
    },
    debugLevel:program.debug?program.debug:-1
});