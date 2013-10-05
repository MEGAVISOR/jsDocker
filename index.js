/**
 *
 * @param program
 * @param program.paths List of paths
 * @param {boolean} [program.json] Out json
 * @param {string} [program.json_out] Path to json out
 * @param {number} [program.debug] Set debug level
 */
module.exports = function(program){
    var path = require('path'),
        fs = require('fs'),
        infilename = program.paths,
// результат сохраним в первую папку которая юыла указана для сборки
        outfiledir = path.join(infilename[0],'docs'),
        jsdoctojson = require("./jsdoctojson.js"),
        json_reductor = require("./json_reductor.js");

    // если не указано че обсчитывать то ничего не делаем
    if (infilename.length <= 0 ){
        return;
    }
    var wrench = require("wrench");
    wrench.mkdirSyncRecursive(outfiledir);

    var outfilename = path.join(outfiledir,'doc.html');

    infilename.forEach(function(filename,index,arr){
        var tst = filename.slice(-8);
        if ( tst !== 'modules' && tst !== '/modules' && tst !== 'modules/'){
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
    }, {
        skipErrCodes: {
            '1': true
        },
        debugLevel: program.debug?program.debug:-1
    });
}
