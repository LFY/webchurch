/* global global, require, module */

// This library contains the built-in Church functions written in Javascript.
// We declare builtins using the syntax
//    var [name] = $x.[name] = function(...) {
// here, $x is a pointer to module.exports
// The reason that we immediately add the function to the exports
// is to avoid having to maintain a big list of exports at the end of the file
// (e.g., module.exports = {a: a, b:b, ...})
// Declaring the function as both a global and a member of $x makes writing
// recursive builtins easier

var util = require('./util.js');
var fs = require('fs');

///Asserts for checking arguments to functions.
///FIXME: if we turn these off, does code go much faster?

function assertArgType(x, type, argTo) {
  argTo = (argTo == 'undefined')? '"' : '" to ' + argTo;
  switch(type) {
  case "function":
    if (typeof(x) != 'function') {
      //doesn't say "is not a function" to avoid special purpose code in evaluate.js
      throw new Error('argument "' + util.format_result(x) + argTo  + ' not a function');}
    break;
    
  case "integer":
    if (typeof(x) != "number" && parseInt(x) != x) {
      throw new Error('"' + util.format_result(x) + argTo + '" is not an integer');
    }
    break;
    
  case "number":
    if (typeof(x) != 'number') {
      throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a number');}
    break;
    
  case "list":
    if (!is_list(x)) {
      throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a list');}
    break;

  case "pair":
    if (!is_pair(x)) {
      throw new Error('argument "' + util.format_result(x) + argTo  + ' is not a pair');}
    break;
    
  default:
    if (typeof(x) != type) {
      throw new Error('argument "' + util.format_result(x) + argTo  + ' has incorrect type');}
  }
}

function assertAllType(list, type, argTo) {
	if (list.length != 0) {
		assertArgType(list[0], type, argTo);
		assertAllType(list[1], type, argTo);
	}
}

function assertNumArgs(args, n, argTo) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + n + ", got " + args.length);
	}
}

function assertNumArgsMulti(args, choices, argTo) {
	if (choices.indexOf(args.length) < 0) {
		throw new Error("Wrong number of arguments to "+ argTo +", expected " + choices.join(" or ") + ", got " + args.length +": "+args);
	}
}

function assertAtLeastNumArgs(args, n) {
	if (args.length < n) {
		throw new Error("Too few arguments, expected at least " + n + ", got " + args.length);
	}
}

// at the end of this file module.exports = $x 
var $x = {};

var the_empty_list = [];
$x.the_empty_list = the_empty_list;

function sizeof(obj) { return Object.keys(obj).length; }

var args_to_array = $x.args_to_array = function(args) {
  return Array.prototype.slice.call(args, 0 );
};

var args_to_list = $x.args_to_list = function list(args) {
  return arrayToList(args_to_array(args));
};

var plus = $x.plus = function() {
	var args = args_to_array(arguments);
	var sum = 0;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "+");
		sum = sum + args[i];
	}
	return sum;
};

var minus = $x.minus = function() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "-");
	if (args.length == (1)) {
		return -args[0];
	} else {
		return args[0] - plus.apply(null, args.slice(1));
	}
};

var mult = $x.mult = function() {
	var args = args_to_array(arguments);
	var prod = 1;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "*");
		prod = prod * args[i];
	}
	return prod;
};

var div = $x.div = function() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "/");
	if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1)); //FIXME: going to give wrong argTo for divisors...
	}
};

var sum = $x.sum = function(list) {
	assertNumArgs(args_to_array(arguments), 1, "sum");
    assertArgType(list, "list", "sum");
	return plus.apply(null, listToArray(list, true));
};

var and = $x.and = function() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
        //FIXME: should check that types are boolean, or accept any truthy types?
		if (!args[i]) {
			return false;
		}
	}
	return true;
};

var all = $x.all = function(list) {
	assertNumArgs(args_to_array(arguments), 1, "all");
    assertArgType(list, "list", "all");
	return and.apply(null, listToArray(list, true));
};

var or = $x.or = function() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
		if (args[i]) {
			return args[i];
		}
	}
	return false;
};

var not = $x.not = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "not");
	return !x;
};

function cmp_nums(cmp_fn, args) {
	assertAtLeastNumArgs(args, 2);
	for (var i = 0; i < args.length - 1; i++) {
		assertArgType(args[i], "number", "comparison");
		if (!cmp_fn(args[i], args[i+1])) return false; 
	}
	return true;
};

var greater = $x.greater = function() {
	return cmp_nums(function(x, y) {return x > y;}, args_to_array(arguments));
};

var less = $x.less = function() {
	return cmp_nums(function(x, y) {return x < y;}, args_to_array(arguments));
};

var geq = $x.geq = function() {
	return cmp_nums(function(x, y) {return x >= y;}, args_to_array(arguments));
};

var leq = $x.leq = function() {
	return cmp_nums(function(x, y) {return x <= y;}, args_to_array(arguments));
};

var eq = $x.eq = function() {
	return cmp_nums(function(x, y) {return x == y;}, args_to_array(arguments));
};

var is_null = $x.is_null = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "null?");
	return x == the_empty_list || (Array.isArray(x) && x.length == 0);
};

var list = $x.list = function() {
	var args = args_to_array(arguments);
	var result = the_empty_list;
	for (var i = args.length-1; i >= 0; i--) {
		result = [args[i], result];
	}
	return result;
};

var is_list = $x.is_list = function(list) {
	assertNumArgs(args_to_array(arguments), 1, "list?");
  var lst = list;
  while (true) {
	  if (!Array.isArray(lst)) {
      return false;
    }
		if (lst.length == 0) {
			return true;
		} else {
			lst = lst[1];
		}
	}
};

var pair = $x.pair = function(a, b) {
	assertNumArgs(args_to_array(arguments), 2, "pair");
	return [a, b];
};

var is_pair = $x.is_pair = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "pair?");
	return x.length == 2;
};

var first = $x.first = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "first");
	if (x.length != 2) {
		throw new Error(util.format_result(x) + " does not have required pair structure");
	} else {
		return x[0];
	}
};

var second = $x.second = function(x) {
	return first(rest.apply(null, arguments));
};

var third = $x.third = function(x) {
	assertArgType(x, "list", "third");
	return first(rest(rest(x)));
};

var fourth = $x.fourth = function(x) {
	assertArgType(x, "list", "fourth");
	return first(rest(rest(rest(x))));
};

var fifth = $x.fifth = function(x) {
	assertArgType(x, "list", "fifth");
	return first(rest(rest(rest(rest(x)))));
};

var sixth = $x.sixth = function(x) {
	assertArgType(x, "list", "sixth");
	return first(rest(rest(rest(rest(rest(x))))));
};

var seventh = $x.seventh = function(x) {
	assertArgType(x, "list", "seventh");
	return first(rest(rest(rest(rest(rest(rest(x)))))));
};

var list_ref = $x.list_ref = function(lst, n) {
  assertArgType(lst, "list", "list lookup");
  assertArgType(n, "number", "list lookup");
  if (n < 0) {
    throw new Error("Can't have negative list index");
  }
  
  var res = lst, error = false;
  for(var i = 0; i < n; i++) {
    if (res.length < 2) {
      error = true;
      break;
    }
    res = res[1];
  }
  if (res.length == 0) {
    throw new Error("list index too big: asked for item #" + (n+1) + " but list only contains " + i + " items");
  }

  return res[0]; 
};

var list_elt = $x.list_elt = function(lst, n) {
  return list_ref(lst, n - 1);  
};

var take = $x.take = function(lst,n) {
    return arrayToList(listToArray(lst).slice(0,n));
};

var drop = $x.drop = function(lst,n) {
    return arrayToList(listToArray(lst).slice(n));
}

var max = $x.max = function(x) {
	var args = args_to_array(arguments);
	return Math.max.apply(Math, args);
};

var min = $x.min = function(x) {
	var args = args_to_array(arguments);
	return Math.min.apply(Math, args);
};

var expt = $x.expt = function(a, b) {
	return Math.pow(a, b);
};

var mean = $x.mean = function(lst) {
    assertArgType(lst,"list","mean");
	var vals = listToArray(lst),
      sum = 0,
      n = vals.length;
  
	for (var i=0; i < n; i++) {
    sum += vals[i];
  }
	return sum / n;
};

var append = $x.append = function() {
	var args = args_to_array(arguments);
	return arrayToList([].concat.apply([], args.map(function(x) {
		assertArgType(x,"list","append");
		return listToArray(x);
	})));
};

var flatten = $x.flatten = function(x) {
	assertArgType(x,"list","flatten");
	var flattened = [];
	var arr = listToArray(x);
	for (var i=0; i<arr.length; i++) {
		var elem = arr[i];
		if (is_list(elem)) {
			flattened = flattened.concat((listToArray(flatten(elem))));
		} else {
			flattened.push(elem);
		}
	}
	return arrayToList(flattened);
};

var fold = $x.fold = function(fn, initialValue, list) {
	var args = args_to_array(arguments);
	fn = args[0];
	assertArgType(fn, "function", "fold");
	initialValue = args[1];
	var lists = args.slice(2);
	var arrs = [];
	for (var i=0; i<lists.length; i++) {
		assertArgType(lists[i], "list");
		arrs.push(listToArray(lists[i]));
	}
	var max_length = Math.min.apply(this, arrs.map(function(el) {return el.length;}));
	var cumulativeValue = initialValue; 
	for (i=0; i<max_length; i++) {
		var fn_args = arrs.map(function(el) {return el[i];});
		fn_args.push(cumulativeValue);
		cumulativeValue = fn.apply(this, fn_args);
	}
	return cumulativeValue;
};

var repeat = $x.repeat = function(n,fn) {
    assertArgType(fn, "function", "repeat");
    assertArgType(n, "number", "repeat");
	var ret = [];
	for(var i=0;i<n;i++) {ret[i] = fn();}
	return arrayToList(ret);
};

var map = $x.map = function() {
  var args = args_to_array(arguments),
      fn = args[0];
  
  assertArgType(fn, "function", "map");
    
  var lists = args.slice(1),
      arr = [],
      numLists = lists.length; 

  var arrays = lists.map(function(L) { return listToArray(L) });
  // ^ have to write it verbosely because otherwise, map will pass in extra arguments
  // namely the current index and the entire array. the index element will
  // get used as the recursive flag to the listToArray function
  // this causes nested maps to have the wrong behavior
  
  var n = Math.min.apply(this, arrays.map(function(a) { return a.length}));

  for(var i=0;i<n;i++) {
		arr[i] = fn.apply(this, arrays.map(function(L) { return L[i]}));
	}

	return arrayToList(arr);
};

var rest = $x.rest = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "rest");
	if (x.length != 2) {
		throw new Error("Argument does not have required pair structure");
	} else {
		return x[1];
	}
};

var length = $x.length = function(x) {
	assertNumArgs(args_to_array(arguments), 1, "length");
  assertArgType(x, "list", "length");
	var len = 0;
	while (x.length != 0) {
		if (x.length != 2) {
			throw new Error("Argument is not a proper list");
		} else {
			x = x[1];
			len++;
		}
	}
	return len;
};

// predefine the length, decently quick and
// not so complicated as recursive merge
// http://jsperf.com/best-init-array/3
var make_list = $x.make_list = function(n, x) {
	assertNumArgs(args_to_array(arguments), 2, "make-list");
	assertArgType(n, "integer", "make-list");
	if (n == 0) return the_empty_list;
	var results = new Array(n);

	for (var i = 0; i < n; i += 1) {
		results[i] = x;
	}
	return arrayToList(results);
};

var is_eq = $x.is_eq = function(x, y) {
	assertNumArgs(args_to_array(arguments), 2, "eq?");
	return typeof(x) == typeof(y) && x == y;
};

var is_equal = $x.is_equal = function(x, y) {
	assertNumArgs(args_to_array(arguments), 2, "equal?");
	if (typeof(x) == typeof(y)) {
		if (Array.isArray(x)) {
			if (x.length == y.length) {
				return is_equal(x[0], y[0]) && is_equal(x[1], y[1]);
			} else {
				return false;
			}
		} else {
			return x == y;
		}
	} else {
		return false;
	}
};

var member_base = $x.member_base = function(x, list, eq_fn) {
	assertArgType(list,"list","member");
	if (list.length == 0) {
		return false;
	} else if (eq_fn(x, list[0])) {
		return list;
	} else {
		return member_base(x, list[1], eq_fn);
	}
};

var member = $x.member = function(x, list) {
	assertNumArgs(args_to_array(arguments), 2, "member");
	return member_base(x, list, is_equal);
};

var apply = $x.apply = function(fn, list) {
	assertArgType(fn,"function","apply");
	assertArgType(list,"list","apply");
	return fn.apply(null, listToArray(list, false));
};

var assoc = $x.assoc = function(obj, alist) {
	assertArgType(alist, "list", assoc);
	alist = listToArray(alist);
	for (var i=0; i<alist.length; i++) {
		assertArgType(alist[i], "pair", assoc);
		if (is_equal(alist[i][0], obj)) {
			return alist[i];
		}
	}
	return false;
};

var regexp_split = $x.regexp_split = function(str, regex) {
	assertArgType(str,"string","regexp_split");
	assertArgType(regex,"string","regexp_split");
	return arrayToList(str.split(regex));
};

var string_to_number = $x.string_to_number = function(str) {
	assertArgType(str,"string","string_to_number");
	return parseFloat(str) || false;
};

var number_to_string = $x.number_to_string = function(num) {
	assertArgType(num,"number","number_to_string");
	return num.toString();
};

var wrapped_uniform_draw = $x.wrapped_uniform_draw = function(items, isStructural, conditionedValue) {
	assertArgType(items,"list","uniform-draw");
  var u = uniformDraw(listToArray(items, false), isStructural, conditionedValue);
	return u; //uniformDraw(listToArray(items, false), isStructural, conditionedValue);
};

var wrapped_multinomial = $x.wrapped_multinomial = function(items, probs, isStructural, conditionedValue) {
	assertArgType(items,"list","multinomial");
	assertArgType(probs,"list","multinomial");
	if (items.length != probs.length) {
		throw new Error("Lists of items and probabilities must be of equal length");
	}
	return multinomialDraw(listToArray(items, false), listToArray(probs), isStructural, conditionedValue);
};

var wrapped_flip = $x.wrapped_flip = function(p, isStructural, conditionedValue) {
	return flip(p, isStructural, conditionedValue) == 1;
};

var wrapped_uniform = $x.wrapped_uniform = function(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4], "uniform");
	assertArgType(a, "number", "uniform");
	assertArgType(b, "number", "uniform");
	return uniform(a, b, isStructural, conditionedValue);
};

var wrapped_random_integer = $x.wrapped_random_integer = function(n,isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [1,3], "random-integer");
	assertArgType(n, "number", "random integer");
    var probs = [], p = 1/n
	for (var i = 0; i < n; i++){probs[i] = p}
    return multinomial(probs,isStructural, conditionedValue)
};

var wrapped_gaussian = $x.wrapped_gaussian = function(mu, sigma, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"gaussian");
	assertArgType(mu, "number", "gaussian");
	assertArgType(sigma, "number", "gaussian");
	return gaussian(mu, sigma, isStructural, conditionedValue);
};

var wrapped_gamma = $x.wrapped_gamma = function(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"gamma");
	assertArgType(a, "number", "gamma");
	assertArgType(b, "number", "gamma");
	return gamma(a, b, isStructural, conditionedValue);
};

var wrapped_beta = $x.wrapped_beta = function(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4],"beta");
	assertArgType(a, "number", "beta");
	assertArgType(b, "number", "beta");
	return beta(a, b, isStructural, conditionedValue);
};

var wrapped_dirichlet = $x.wrapped_dirichlet = function(alpha, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [1,3],"dirichlet");
	assertArgType(alpha, "list", "dirichlet");
	assertAllType(alpha, "number", "dirichlet");
	alpha = listToArray(alpha, true);
	return arrayToList(dirichlet(alpha, isStructural, conditionedValue));
};

var wrapped_traceMH = $x.wrapped_traceMH = function(comp, samples, lag) {
	var inn = traceMH(comp, samples, lag, false, "lessdumb").map(function(x) {return x.sample});
	var res = arrayToList(inn);
	return res;
};

var wrapped_enumerate = $x.wrapped_enumerate = function(comp) {
	var d = enumerateDist(comp);
	var p=[],v=[];
	var norm = 0;
	for (var x in d) {
		p.push(d[x].prob);
		v.push(d[x].val);
		norm += d[x].prob;
	}
	var res = list(arrayToList(v), arrayToList(p.map(function(x){return x/norm})));
	return res;
};

var wrapped_evaluate = $x.wrapped_evaluate = function(code) {
    //need to turn the code list back into a string before calling the webchurch evaluate...
    code = util.format_result(code);
    return evaluate(code);
};

var read_file = $x.read_file = function(fileName) {
	assertArgType(fileName, "string", "read-file");
	return fs.readFileSync(fileName, "utf8");
};

var display = $x.display = function(str) {
  var args = args_to_array(arguments);
  var strs = args.map(util.format_result);
  console.log(strs.join(" "));
};


var listToArray = $x.listToArray = function(list, recurse) {
	var array = [];
	while (list.length > 0) {
		var left = list[0];
		array.push((Array.isArray(left) && recurse) ? listToArray(left) : left);
		list = list[1];
	}
	return array;
};

var arrayToList = $x.arrayToList = function(arr) {
	if (arr.length == 0) {
		return the_empty_list;
	} else {
	var i = arr.length, r = [];
	while (i--) {
	  r = [arr[i], r];
	}
	return r;
	}
};

var string_append = $x.string_append = function() {
  var args = args_to_array(arguments);
  return args.join(""); 
};

var symbol_to_string = $x.symbol_to_string = function(sym) {
  return sym;
};

var iota = $x.iota = function(n) {
  var r = [];
  for(var k = 0; k < n; k++) {
    r.push(k);
  }
  return arrayToList(r);
};

module.exports = $x;

// var args = args_to_array(arguments);
// var strs = args.map(util.format_result);
// console.log(strs.join(" "));
