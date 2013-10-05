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

            // перебираем дерево
            for (var name in tree){

                if (tree.hasOwnProperty(name)){

                    //  если какая-то ветвь пустая то пропускаем ее
                    if (isEmpty(tree[name])){
                        continue;
                    }

                    // разбиваем название нашей ветви на куски
                    var ns = name.split('.'),
                        // складываем результат в obj нам так удобнее
                        obj = result,
                        // урлы у нас внутри страницы посему они начинаются с #
                        url = '#',
                        // это генерируемый неймспейс
                        nameSpaceGenerated = [];

                    // если мы после разбивки получили что нейспейс состоит хотябы из одного объекта
                    if (ns.length > 0){

                        ns.forEach(function(itm){
                            // добавляем к урлу кусочек неймспейса
                            url += '_' + itm;
                            // запоминаем кусочек в генераторе
                            nameSpaceGenerated.push(itm);

                            // если у нас нету неймспейса в конечном дереве то создаем его
                            if(!obj[itm]){
                                obj[itm] = {
                                    '!url':url, // это будет ссылка на узел
                                    '!ns' :nameSpaceGenerated.join('.') // это название неймспеса (вероятно )
                                };
                            }
                            // смещаем указатель в глубину неймспейса
                            obj =  obj[itm];

                        });
                    }
                    // после прохода по неймспейсу у нас сгенерирурется объект
                    // например для Animals.Jaguar
                    //{
                    //    'Animals':{
                    //        '!url':'#_Animals',
                    //        '!ns':'Animals',
                    //        'Jaguar':{
                    //            '!url':'#_Animals_Jaguar',
                    //            '!ns':'Animals.Jaguar'
                    //        }
                    //    }
                    //}
                    //

                }
            }
            return result;
        };



        var namespaceTree = prepareNamespaceTree(tree);

        var orderAlfabatically = function(ns){
            // пытаемся отсортировать неймспейсы

            if (ns === Object(ns)){
                var result = {},
                    items = [];
                // сначала извлекаем все ключи для текущего уровня
                for (var prop in ns){
                    if (ns.hasOwnProperty(prop)){
                        items.push(prop);
                    }
                }

                // сортируем
                items.sort();

                items.forEach(function(item){
                    // складываем в правильном порядке в результат
                    // и просим тоже самое проделать с дочерними элементами каждого ключа
                    result[item] =  orderAlfabatically(ns[item]);
                });
                // возвращаем правильно отсортированный объект
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