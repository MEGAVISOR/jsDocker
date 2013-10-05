module.exports = function(infile,outfile){
    var path = require('path');
    // на входе файл json
    var infilename = infile?infile:process.argv[2];
    // на выходе документ
    var outfilename = outfile?outfile:process.argv[3];

    var template = './templates/default.ejs';

    var fs = require('fs');
    var util = require('util');

    // шаблонизатор
    var ejs = require('ejs');

    var convert = function(infile,outfile,template){
        // загружаем дерево


        var tree;
        if (typeof infile === "string"){
            tree = JSON.parse(fs.readFileSync(infile,{encoding:'UTF8'}));
        } else if ( infile === Object( infile ) ){
            tree = infile;
        }

        // todo ругнуться на битый/отсутствующий файл или невалидный жсон


        var isEmpty = function(itm){ if ( itm instanceof Object ){ return Object.getOwnPropertyNames(itm).length === 0; } };

        var prepareNamespaceTree = function(tree){
            // тут такое дело что дерево очень хорошо сделать в виде дерева
            var result = {};
            for (var name in tree){
                if (tree.hasOwnProperty(name)){

                    if (isEmpty(tree[name])){
                        continue;
                    }

                    var ns = name.split('.');

                    var obj = result;
                    var url = '#';
                    var nsg = [];
                    if (ns.length > 0){
                        ns.forEach(function(itm){
                            url += '_' + itm;
                            nsg.push(itm);
                            if(!obj[itm]){
                                obj[itm] = {};
                                obj[itm]['!url'] = url;
                                obj[itm]['!ns'] = nsg.join('.');
                            }
                            obj =  obj[itm];
                        });
                    }
                }
            }
            return result;
        };



        var namespaceTree = prepareNamespaceTree(tree);

        var orderAlfabatically = function(ns){
            if (ns === Object(ns)){
                var result = {};
                var items = [];
                for (var prop in ns){
                    if (ns.hasOwnProperty(prop)){
                        items.push(prop);
                    }
                }
                items.sort();
                items.forEach(function(item){
                    result[item] =  orderAlfabatically(ns[item]);
                });
                return result;
            }
            return ns;
        };

        namespaceTree = orderAlfabatically(namespaceTree);

        var makeLinkFromNS = function(ns){
            var result = '_';
            result += ns.replace(/\./g,'_');
            return result;
        };

        var makeLinkToType = function(str){
            if (util.isArray(str)){
               var result = [];
               str.forEach(function(itm){
                   result.push( makeLinkToType(itm) );
               });

               return result.join(', ');
            } else if ( str === Object( str ) ){ // объект
                if ( str.container || str.inTypes ){
                    var multitype = '<span class="type-container">' + str.container + '</span>' + ' содержащий (' + makeLinkToType(str.inTypes) + ')';
                    return multitype;
                } else if (str.many){
                    // если у нас просто тупо тип
                    return '... ' + makeLinkToType(str.type);
                } else {
                    return makeLinkToType(str.type);
                }
            } else if( typeof str  === "string" ) {
                if ( str.search(/(Object|Array|String|Number|Boolean|Function|Undefined|Null|\*|JQuery|Element)(\[\])?/ig)>=0 ){
                    return str;
                } else {
                    var lnk = '_' + str.replace(/[\[\]]/g,'').split('.').join('_');
                    return '<a href= "#' + lnk + '">' + str + '</a>';
                }
            } else {
                return str;
            }
        };

        // проверяет неймспейс ли это или нет
        var isNS = function(str){
            return !str.match(/[^\w\.]/g);
        };

        var output = ejs.render(
            fs.readFileSync(path.join(__dirname,template),{encoding:'UTF8'}),
            {
                tree            : tree,
                namespaceTree   : namespaceTree,
                isEmpty         : isEmpty,
                makeLinkFromNS  : makeLinkFromNS,
                makeLinkToType  : makeLinkToType,
                isNS            : isNS
            }
        );
        if ( typeof outfile === "function" ){
            outfile(output);
        } else if(typeof outfile === "string") {
            // создаем директорию если таковой нету
            fs.writeFileSync(outfile,output);
        }
    };

    convert(infilename, outfilename, template);
};