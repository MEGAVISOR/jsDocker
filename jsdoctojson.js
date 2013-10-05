/*
 *
 * Правила написания доков
 * 1) Указывайте название класса '@class some.name.space' или '@class @name some.name.space'
 * 2) Указывайте @memberOf для привязки одного жсдока к какому либо неймспейсу
 * 3) Указывайте @lends some.name.space и @lends some.name.space.prototype для группы статиков и честных членов соотвественно
 * 4) @lends работает до конца файла или до следующего @lends
 * 5) класс не может быть чьим либо членом но удобно размещается в дереве неймспейсов
 * 6)
 *
 * @param infile
 * @param outfile
 */
module.exports = function(infile,outfile,options){
    var fs = require('fs'),
        path = require('path'),
        util = require('util');

    /**
     *
     * @param str
     * @param reg
     * @return {Object}
     * @return {Object.match}
     * @return {Object.indexes}
     */
    var matchWithIndex = function(str,reg){
        var match = str.match(reg);
        var result = {
            match: null,
            indexes : [],
            lengths : []
        };
        if (match){
            result.match = match;
            var numb = 0;
            match.forEach(function(itm,index){
                result.indexes[index] = str.indexOf(itm,numb);
                numb = result.indexes[index];
                result.lengths[index] = itm.length;
            });
        }
        return result;
    };

    var debugLevels = {
        CRITICAL_ERROR:0,
        ERROR:1,
        WARNING:2,
        SOMETHING_WRONG:3,
        JUST_MESSAGE:4
    };
    var DL = debugLevels;
    //todo namespace


    var debugOut = [];
    var debug = function(dbglvl,msg){
        debugOut.push({debugLevel:dbglvl,msg:msg});
    };
    var makePlan = function(infilename, outfilename, returnData, tree){

        debug(DL.JUST_MESSAGE, 'process file ' + infilename);

        var settings = {
            input:infilename,
            out:outfilename
        };

        if (tree){
            settings.tree = tree;
        }

        var openFile = function (settings, done, fail){
            fs.readFile(settings.input, {encoding:'utf8'},function(err,data){
                if (err) {
                    fail(err,settings);
                } else {
                    settings.openFile = data;
                    done(settings);
                }
            });
        };

        var findLends = function(settings, done, fail){
            var pattern = /@lends\s+[\w\.]+(\s+)?\*\/[\s\S]+?(?=\/\*\*\s+@lends|$)/g;
                ///@lends\s+([\w\.]+)(?:\s+)?\*\/([\s\S]+?)\/\*\*\s+(?=@lendsend|@lends|\0)/g;


            var patternWithGroups = /@lends\s+([\w\.]+)(?:\s+)?\*\/([\s\S]+)/;
            var srch = matchWithIndex(settings.openFile,pattern);
            //console.log(match);
            //console.log(match.length);
            //console.log(settings.openFile);
            //console.log(match);
            if (srch.match && srch.match.length>0){
                settings.findLends = [];
                srch.match.forEach(function(itm,index){

                    var groups = itm.match(patternWithGroups);

                    settings.findLends[index] = {
                        namespace: groups[1],
                        needParse: groups[2],
                        startPos : srch.indexes[index],
                        len      : srch.lengths[index]
                    };
                });

            }
            //process.exit(0);
            done(settings);
        };

        // возвращает массив блоков с jsdoc
        var parseTextForAllJSDocs = function (settings, done, fail){
            settings.allJSDocs = [];

            var reg = /\/\*\*([\s\S]+?)(?=\/\*\*|$)/g;
            var result = matchWithIndex(settings.openFile,reg);
            if (result.match){
                result.match.forEach(function(itm,index){
                    var itmWithText = itm.match(/\/\*\*([\s\S]+?)\*\/([\s\S]+)/);
                    var memberOf = null;



                    // если есть лендинги
                    if (itmWithText && settings.findLends && settings.findLends.length>0){

                        settings.findLends.forEach(function(lend){
                            // входит ли данный док в этот лендинг


                            if (
                                result.indexes[index] >= lend.startPos &&
                                result.indexes[index] <= lend.startPos + lend.len
                            ){
                                memberOf = lend.namespace;
                            }
                        })
                    }

                    var isEmpty = false;
                    // если док пустой то метим его таковым
                    if ( itmWithText[1].replace(/[\*\r\n]/g,' ').replace(/s+/,'') == ''){
                        isEmpty = true;
                    }

                    if (itm.indexOf('@lends')>=0){
                        // пропускаем доки с лендсами
                        return;
                    }

                    settings.allJSDocs.push({
                        original:itmWithText[1],
                        afterDoc:itmWithText[2],
                        memberOf: memberOf,
                        isEmpty : isEmpty,
                        ind : result.indexes[index]
                    })
                });
            }
            if ( settings.allJSDocs.length > 0 ){
                done(settings);
            } else {
                fail({code:1,message:'notFoundJsDocs'},settings);
            }

        };

        var parseJSDocForTags = function ( settings, done, fail ){
            var possibleTags = require('./tags/default').tags;

            var impossibleTags = [];

            var postFilter = function(filter,str){
                if (filter && filter.pattern){
                    var match = str.match(filter.pattern);
                    if( filter.matchIndex !== undefined ){
                        match = match[filter.matchIndex].trim();
                    }
                    return match;
                } else {
                    return str;
                }
            };

            var attrDetect = function( detectRules, str, tags, docs, index ){
                if (detectRules && detectRules.func){
                    // str это полученный тег возможны  match или строка
                    // tags это коллекция найденных тегов в этом доке
                    return detectRules.func(str, tags, docs, index);
                } else {
                    return str;
                }
            };

            var cleanJsDoc = function(jsdoc){

                jsdoc = jsdoc.replace(/(\s+)?\/\*\*(\s+)?/,'');
                jsdoc = jsdoc.replace(/(\s+)?\*\/(\s+)?/,'');
                jsdoc = jsdoc.replace(/(\r\n|\n)(\s+)?\*/g,'');

                return jsdoc;
            };

            // разбираем пачку доков
            settings.allJSDocs.forEach(function(itm,index){
                if (!itm.original){return}; // такое возможно если док пустой или например если док добавлен вручную


                // берем один док парсим теги
                itm.processing =  cleanJsDoc(itm.original);
                var uuid = index + ':' + new Date().getTime() + ':' + infilename;
                itm.tags = {
                    docId:uuid,
                    locationUuid: uuid // эта штука пригодится когда появятся непонятные констракты в глобале
                };
                possibleTags.forEach(function(tag){
                    if (tag.off) return;


                    var str = tag.noClean?itm.original:itm.processing;

                    var match = str.match(tag.pattern);
                    if ( match !== null ){
                        if(tag.matchIndex !== undefined){
                            match = match[tag.matchIndex].trim();
                        }
                        if (!util.isArray(match)){ match = [match]};
                        match.forEach(function(fitm,ind,arr){
                            fitm = postFilter(tag.postFilter, fitm);
                            fitm = attrDetect(tag.attrDetect,fitm, itm.tags, settings.allJSDocs, index);
                            arr[ind] = fitm;
                        });
                        itm.tags[tag.name] = match ;
                    }
                });
                var tmpTags = itm.processing.match(/@\S+/g);
                impossibleTags = impossibleTags.concat(tmpTags?tmpTags:[]);
                if (itm.memberOf && itm.tags && (!itm.tags.memberOf)){ // пустой мембер офф приведет к ошибке а ибо нефиг
                    itm.tags.memberOf = [itm.memberOf];
                }
            });

            possibleTags.forEach(function(tag){
                impossibleTags = impossibleTags.filter(function(itm){ return itm !== '@' + tag.name; });
                if (tag.synonyms){
                    tag.synonyms.forEach(function(synonim){
                        impossibleTags = impossibleTags.filter(function(itm){ return itm !== '@' + synonim; });
                    })
                }
            });

            if (impossibleTags.length>0){
                debug(DL.WARNING,'В файле '+ infilename +' Неопознанные теги:')
                debug(DL.WARNING, impossibleTags.join('\n'));
            }

            done(settings);

        };

        var buildTree = function(settings,done,fail){

            var tree = {};
            if (settings.tree){
                tree = settings.tree;
            }

            // сначала соберем lands или если таковых нету то найдем класс


            /// Обходим все распаршенные теги и смотрим в какие неймспейсы они попадают

            if (settings.allJSDocs && settings.allJSDocs.length>0){
                //1) Доки есть и их больше чем одна

                var checkNamespace = function( itm, tree ){
                    var ns = null;
                    if (itm.tags.class){
                        if (itm.tags.class[0].nameSpace && itm.tags.class[0].nameSpace.length > 0){
                            ns = itm.tags.class[0].nameSpace;
                        } else {
                            if (itm.tags.name && itm.tags.name[0].length > 0){
                                ns = itm.tags.name[0];
                                itm.tags.class[0].nameSpace = itm.tags.name[0]; // подправим класс
                            }
                        }
                        // класс сам по себе он никому не принадлежит
                        itm.tags.memberOf = null;

                    } else if (itm.tags.lends){
                        if (itm.tags.lends[0].nameSpace && itm.tags.lends[0].nameSpace.length > 0){
                            ns = itm.tags.lends[0].nameSpace;
                        }
                    } else if (itm.tags.constructs){
                        if (itm.tags.constructs[0].nameSpace && itm.tags.constructs[0].nameSpace.length > 0){
                            ns = itm.tags.constructs[0].nameSpace;
                        }
                    } else if (itm.tags.space){// если конструктор попал в лендинг то сам себе злой буратино
                        if (itm.tags.space[0].nameSpace && itm.tags.space[0].nameSpace.length > 0){

                            // выкидываем прототип
                            itm.tags.space[0].nameSpace = itm.tags.space[0].nameSpace.replace(/\.prototype/,'');

                            ns = itm.tags.space[0].nameSpace;

                            // неймспейс сам по себе он никому не принадлежит
                            itm.tags.memberOf = null;
                        }
                    }
                    if (itm.tags.memberOf && itm.tags.memberOf[0].length > 0){
                        if (itm.tags.memberOf[0].indexOf('prototype') < 0){
                            itm.tags.static = [true];
                            // если это не свойство прототипа то фиксим
                        } else {
                            // чтобы не рушить неймспейсы переносим без прототипа
                            itm.tags.memberOf[0] = itm.tags.memberOf[0].replace(/\.prototype/,'');
                        }
                        ns = itm.tags.memberOf[0];
                    }

                    //console.log('opa',tree);
                    if (ns && !tree[ns]){
                        tree[ns] = {}
                    }
                };

                /**
                 * Пытается определить имя если сможет то запишет в jsdocItem
                 * Если jsdoc пустой и не получилось определить имя то вернет фальш
                 * @param jsdocItem
                 * @return {Boolean}
                 */
                var tryDetectName= function(jsdocItem){

                    var name;
                    var def;
                    // это удаляет полнострочные комментарии например как этот
                    var result = jsdocItem.afterDoc.replace(/\/\/(|.+)(?=[\r\n]+)/g,'');

                        result = result.replace(/\/\*(.|[\r\n])+\*\//g,'');

                        result = result.replace(/[\r\n]/g,' ');
                        result = result.replace(/[\s]+/g,' ');

                    if (result !== ' '){
                        var tmp = result.slice(0,30);

                        def = result.match(/^[\r\n\s]+([\w]+)(?=(\s+)?\()/m);

                        // если повезло то мы узнали название функи
                        name = def?def[1]:null;

                        if (!name){
                            def = result.match(/^[\r\n\s]+static\s+([\w]+)(?=(\s+)?\()/m);
                            name = def?def[1]:null;
                        }

                        /*if (!name){
                            def = result.match(/^[\r\n\s]+static\s+([\w]+)(?=(\s+)?\=)/m);
                            name = def?def[1]:null;
                        }*/

                        if (!name){
                            //this.somthing =
                            def = result.match(/^[\r\n\s]+this\.([\w]+)(?=(\s+)?\=)/m);
                            name = def?def[1]:null;
                        }

                        if (!name){
                            //run : function (
                            def = result.match(/^[\r\n\s]+([\w]+)(\s+)?\:(\s+)?function(?=(\s+)?\()/m);
                            name = def?def[1]:null;
                        }

                        if (!name){
                            //_runningApps :
                            def = result.match(/^[\r\n\s]+([\w]+)(\s+)?(?=(\s+)?\:)/m);
                            name = def?def[1]:null;
                        }

                        if (!name){
                            //MV.isEqual =
                            def = result.match(/^[\r\n\s]+([\w\.]+)(?=(\s+)?\=(\s+)?)/m);
                            name = def?def[1]:null;
                        }

                        if (!name){
                            // выводим нераспознанные имена
                            debugOut.push({msg:'i can not understand name: ' + tmp + '  |  ' + infilename, debugLevel: DL.SOMETHING_WRONG});
                        }
                    }

                    jsdocItem.tags.docId = name?name:jsdocItem.tags.docId;

                    return (!jsdocItem.isEmpty || name);
                };

                var placeItem = function(itm, tree){
                    // если дог содержит тег который является неймспейсообразующим то
                    // если это класс то классовые атрибуты кладем в скрытое деревце
                    //                   атрибуты конструктора валим в конструктор

                    if ( itm.tags.class || itm.tags.space){

                        var place = itm.tags.class?itm.tags.class[0].nameSpace:itm.tags.space[0].nameSpace;
                        if (!place || place === ''){
                            debugOut.push({msg:'not specified Class name or Namespace name \n' + JSON.stringify(itm.tags,null,4), debugLevel: DL.SOMETHING_WRONG});
                            return;
                        }

                        for ( var prop in itm.tags){
                            if ( itm.tags.hasOwnProperty(prop)){
                                tree[place]['@'+prop] = itm.tags[prop];
                            }
                        }
                    }

                    // если мы член неймспейса то падаем в этот неймспейс с помощью своего айдишника
                    if ( itm.tags.memberOf && !itm.tags.class ){
                        if (!itm.tags.name){
                            if (!tryDetectName(itm)){
                                return;
                            }
                        }

                        tree[itm.tags.memberOf][itm.tags.docId]=itm.tags;
                    }

                    if ( !itm.tags.memberOf && !itm.tags.class ){
                        if (!itm.tags.lends){
                            if(!tree['global']){
                                tree['global'] = {
                                    "@description":["Это глобальная область видимости если сюда попал какой-то метод то значит где-то ошибка в jsdoc"]
                                };
                            }
                            if (!itm.tags.name){
                                if (!tryDetectName(itm)){
                                    return;
                                }
                            }
                            // Если док представляет собой неймспейс (@namespace) то его прокидываем мимо всего
                            if (!itm.tags.space){
                                tree['global'][itm.tags.docId] = itm.tags;
                            }
                        }
                    }

                };

                settings.allJSDocs.forEach(function(item){
                    //2) проверяем надо-ли создавать неймспейс
                    checkNamespace( item, tree );
                    placeItem( item, tree );

                });
                settings.tree = tree;
                //tings.tree['MV.Error'])
                done(settings);
            }

            //todo сделать описание дерева ато чето пиздос
            //разбить нормально пропретисы и конструктор
            //и вообще чето надо нормально делать

            //done(settings);

        };

        var plan = [
            openFile,
            findLends,
            parseTextForAllJSDocs,

            parseJSDocForTags,
            buildTree/*,
            replaceAllJsDocsForMarkdown,
            writeFile*/
        ];

        var index = -1;

        var showError = function(err,settings){

            if (!options.skipErrCodes[err.code]){
                console.log(err);
            }
            if (err.code == 1){
                // можно проскипать
                returnData(settings.tree);
            }
        };

        var doNext = function(settings){
            index++;
            if (index < plan.length){
                plan[index](settings,doNext,showError);
            } else {

                //хак для теста
                settings.result = settings.tree;
                returnData(settings.result);
                debug(DL.JUST_MESSAGE,'All Done');
            }
        };

        doNext(settings);

    };

    debug(DL.JUST_MESSAGE, 'hello. I parse all you files now.');

    var infilename = infile;
    var outfilename = outfile;



    var inputFiles = [];

    // чтобы наверняка массив
    infilename = [].concat(infilename);

    var collect_files_recursive = function(dir){
        var resultList = [];
        var files = fs.readdirSync(dir);
        if (files && files.length > 0){
            files.forEach(function( file ){
                var fullFileName = path.join(dir,file);
                stat = fs.statSync(fullFileName);
                if ( stat.isFile() ){
                    var ext = path.extname(file);
                    ext =     ext.split('.');
                    if (ext[1]=='js'){
                        resultList.push(fullFileName);
                    }
                } else if (stat.isDirectory()){
                    resultList = resultList.concat( collect_files_recursive( fullFileName ) );
                }
            })
        }
        return resultList;
    };

    for(var i=0;i<infilename.length;i++){
        var stat = fs.statSync(infilename[i]);

        if ( stat.isFile() ){
            inputFiles.push(infilename[i])
        } else if ( stat.isDirectory() ) {
            inputFiles = inputFiles.concat(collect_files_recursive(infilename[i]));
        }
    }

    debug(DL.JUST_MESSAGE,'files to process');
    debug(DL.JUST_MESSAGE, inputFiles.join('\n'));

    var CC = consoleColors = {
        black   : '\033[30m',
        gray    : '\033[30;1m',
        red     : '\033[31m',
        green   : '\033[32m',
        blue    : '\033[34m',
        magenta : '\033[35m',
        cyan    : '\033[36m',
        reset   : '\033[0m',
        r : function(str){
            return this.red + str + this.reset;
        },
        b : function(str){
            return this.blue + str + this.reset;
        }
    };
    var index = -1;

    var processNextFile = function( data ){
        index++;
        debug(DL.JUST_MESSAGE,index);
        if (index <= inputFiles.length - 1){
            makePlan( inputFiles[index], outfilename, processNextFile, data );
        } else {

            var dbgColors =[
                CC.red,
                CC.magenta,
                CC.blue,
                CC.cyan,
                CC.green
            ];
            for( var i=0; i < debugOut.length; i++){
                if ( debugOut[i].debugLevel <= options.debugLevel ){
                    console.log(dbgColors[debugOut[i].debugLevel] + debugOut[i].msg );
                }
            }

            if (typeof outfilename === "function"){
                outfilename(data);
            } else if (typeof outfilename === "string"){
                var outStr = JSON.stringify( data, null, 4 );
                fs.writeFileSync(outfilename,outStr);
            }

        }
    };
    processNextFile({});
};