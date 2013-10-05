
var havyTypeDetect = function(str){
    // str == type1|type2|Array.<type3|type4>|type5>



    var intypes = str.match(/(?:^)?(([\w\.]+)|([\w\.]+\.\<[\w\.\|]+\>))(?=\||$)/g);

    var types = [];

    if (intypes){
        // какието типы определились

        intypes.forEach(function(intype){
            var itm;
            var containerType = null, inTypes = null;
            var many = null;
            if (intype.slice(0,3)== '...'){
                itm = intype.slice(3);
                many = true;
            } else {
                itm = intype;
            }
            var match = itm.match(/([\w\.]+)\.\<([\w\.\|]+)\>/);
            if (match){
                containerType = match[1];
                inTypes = match[2].split('|');
            }
            var result = {
                container:containerType,
                inTypes:inTypes,
                type: itm,
                many: many
            };
            types.push(result);
        })
    }
    return types;
}

// заменяет все ссылки на нормальные ссылки
var replaceLinkToHttpLink = function(text){
    var reg = /(\[(.+?)\]\{(?:\s+)?@link\s+([^} ]+)\}|\{(?:\s+)?@link\s+?([^} ]+)\|(.+?)\}|\{(?:\s+)?@link\s+([^} ]+)(?:\s+)?\})/;
    var regGlobal = /@link/g;
    var match = text.match(regGlobal);

    var makeLinkFromNamespace = function(str){
        if (str){
            if ( !str.match(/(http|\:|\/|\#)/) ){ // проверям что это не прямой урл
                return '#_' + str.split('.').join('_');
            }
            return str;
        }
        return '';
    };

    var link = function(linkto,caption){
        var title = caption?caption:linkto;
        if (linkto){
            return '<a href="' + makeLinkFromNamespace(linkto) + '">'+ title +'</a>';
        }
        // не ну а чо вы хотели
        return '';
    };

    if (match){
        var b = text;
        for (var i =0; i< match.length;i++){
            b = b.replace(reg,function(){
                if ( arguments[2] && arguments[3] ){
                    return link(arguments[3], arguments[2])
                } else if (arguments[4] && arguments[5]){
                    return link(arguments[4],arguments[5])
                } else if (arguments[6]){
                    return link(arguments[6])
                } else {
                    return ''; // если у нас чо-то совпало но ниче не совпало то просто заменяем все это на ''
                }
            });
        }
        return b;
    }
    return text;
}

module.exports.tags = [
    {
        off: 0,
        name: 'class',
        pattern:/@class(?:\s+)?(|[\w\.]+)(:?\s+)?(?=@|$)/gm,
        postFilter:{
            pattern:/@class(?:\s+)?(|[\w\.]+)(?:\s+)?(?=@|$)/m
            ,matchIndex:1
        },
        attrDetect:{
            func:function( classData){
                var className = classData;
                var result = {
                    nameSpace:className
                };

                return result;
            }
        }
    },{
        // конструкторы парсим отдельно от классов
        // если очень припрет то генерим отдельно или прописываем и класс и констракт
        off: 0,
        name: 'constructs',
        synonyms: ['constructor'],
        pattern:/(?:@constructor|@constructs)(?:\s+)?(|[\w\.]+)\s+(?=@|$)/g,
        postFilter:{
            pattern:/(?:@constructor|@constructs)(?:\s+)?(|[\w\.]+)\s+(?=@|$)/
            ,matchIndex:1
        },
        attrDetect:{
            func:function( constructorData , tags){
                var className = constructorData;
                var result = {
                    nameSpace:className // вдруг у конструктора указано кому он принадлежит
                };
                tags.name = true; // типа мы точно знаем название функции
                tags.docId = 'constructs'; // это имя функции

                return result;
            }
        }
    },{
        off: 0,
        name: 'lends',
        pattern:/@lends\s+([\w\.]+)/g,
        postFilter:{
            pattern:/@lends\s+([\w\.]+)/
            ,matchIndex:1
        },
        attrDetect:{
            func:function( lendsNameSpace ){
                var result = {
                    nameSpace:lendsNameSpace
                };
                return result;
            }
        }

    },{
        off: 0,
        name: 'name',
        pattern:/@name\s+([\w\.]+)(\s+)?(?=@|$)/,
        matchIndex:1,
        attrDetect:{
            func:function( name , tags ){
                tags.docId = name; // это ключ по которому приземляем в дерево доков
                return name;
            }
        }
    },
    {
        off: 0,
        name: 'memberOf',
        pattern:/@memberOf\s+([\w\.]+)\s+(?=@|$)/,
        matchIndex:1
    },
    {
        off: 0,
        name: 'param',
        pattern:/@param(|.+?)(?!@link)(?=@|$)/gm,
        postFilter:{
            pattern:/@param(|.+?)(?!@link)(?=@|$)/m
            ,matchIndex:1
        },
        attrDetect:{
            func:function( str ){

                var pattern = /(?:\{(.+?)\})?(?:\s+)?(?:\[([\w\.]+)(?:\=([\w\.\'\"]+))?\]|([\w\.]+))?(?:\s+)?(.+)?/i;
                var matches = str.match(pattern);
                var result = {
                    type:matches[1]?havyTypeDetect(matches[1]):[],
                    name:matches[2]?matches[2]:matches[4],
                    required:matches[2]?false:true,
                    default:matches[3],
                    description: matches[5]?replaceLinkToHttpLink( matches[5] ):matches[5]
                };
                return result;
            }
        }
    },
    {
        off: 0,
        name: 'returns',
        synonyms: ['return'],
        pattern:/(@return|@returns)\s+(|\{(.+)\})(\s+)?(?=@|$)/,
        matchIndex:3,
        attrDetect:{
            func:function( str ){
                if (str){
                    return havyTypeDetect(str);;
                } else {
                    return [];
                }
            }
        }
    },
    {
        off: 0,
        noClean: true,
        name: 'example',
        pattern:/@example([^@]+)/,
        matchIndex:1,
        attrDetect:{
            func:function( example ){
                var res = example.replace(/[ \f\r\t\v]*\*/g,'');//.replace(/\*/g,'\r\n');
                /*
                // Нужно вернуть форматирование после того как мы его порушили
                var beautify = require('js-beautify').js_beautify; // эта штука умеет делать жс красивым
                res =  beautify(res, {
                    indent_size         : 4,
                    preserve_newlines   : false,
                    indent_char         :'&nbsp;'
                });
                res = res.replace(/\n/g,'<br/>');
                */
                return res;
            }
        }
    },
    {
        off: 0,
        name: 'method',
        synonyms:['func','function'],
        pattern:/(:?@method|@function|@func)(?:\s+)?(|.+)\s+(?=@|$)/,
        matchIndex:1
    },
    {
        // это  inline тег по идее его парсить надо иначе
        // он целиком попадает в дескрипшон,
        // в теории дескрипшон потом надо как-то иначе разобрать возможно как массив сделать.
        off:0,
        name: 'link',
        pattern:/(|\[(.+)\])\{@link\s+(.+?)(|\|(.+?))\}/g,
        postFilter:{
            pattern:/(|\[(.+)\])\{@link\s+(.+?)(|\|(.+?))\}/
        },
        attrDetect:{
            func:function( match ){
                var result = {caption:null,url:'http://google.com'}; // тонко правда? ;)
                if (match){
                    result.url = match[3]?match[3]:'';
                    result.caption = match[2]?match[2]:match[5]?match[5]:result.url;
                }
                return result;
            }
        }
    },{
        off:0,
        name:'private',
        pattern:/@private/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        off:0,
        name:'public',
        pattern:/@public/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        // этот тег не обязательно описывает член класа надо проверять остальные теги
        off:0,
        name:'type',
        pattern:/@type(?:\s+)?([\w\.\<\>\{\}\|]+)(\s+)?(?=@|$)/gm,
        postFilter:{
            pattern:/@type(?:\s+)?(?:\{)?(?:\s+)?([\w\.\<\>\|]+)(?:\s+)?(?:\})?(\s+)?(?=@|$)/
            ,matchIndex:1
        },
        attrDetect:{
            func:function( typeStr ){
                return havyTypeDetect(typeStr);
            }
        }

    },{
        off:0,
        name:'extends',
        pattern:/@extends(?:\s+)([\w\.]+)(\s+)?(?=@|$)/g,
        postFilter:{
            pattern:/@extends(?:\s+)([\w\.]+)(\s+)?(?=@|$)/
            ,matchIndex:1
        }
    },{
        off:0,
        name:'space',
        synonyms:['namespace'],
        pattern:/@namespace(?:\s+)([\w\.]+)(?:\s+)?(?=@|$)/g,
        postFilter:{
            pattern:/@namespace(?:\s+)([\w\.]+)(?:\s+)?(?=@|$)/
            ,matchIndex:1
        },
        attrDetect:{
            func:function( nameSpace, tags ){
                var result = {
                    nameSpace:nameSpace
                };

                tags.name = true;

                return result;
            }
        }
    },{
        off:0,
        name:'deprecated',
        pattern:/(@deprecated)/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        off:0,
        name:'static',
        pattern:/(@static)/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        off:0,
        name:'override',
        pattern:/(@override)/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        off:0,
        name:'const',
        pattern:/@const\s+/g,
        attrDetect:{
            func:function( match ){
                return !!match;
            }
        }
    },{
        off:0,
        name:'description',
        pattern:/.+?(?!@link)(?=@|$)/,
        matchIndex:0,
        attrDetect:{
            func:function( text ){
               return replaceLinkToHttpLink(text);
            }
        }

    }
];