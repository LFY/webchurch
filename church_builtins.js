var util = require('./util.js');

var the_empty_list = [];

function sizeof(obj) { return Object.keys(obj).length; }

function args_to_array(args) { return Array.prototype.slice.call(args, 0 ); }

function args_to_list(args) { return arrayToList(args_to_array(args)); }

function plus() {
	var args = args_to_array(arguments);
	var sum = 0;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "+");
		sum = sum + args[i];
	}
	return sum;
}

function sum(list) {
	assertNumArgs(args_to_array(arguments), 1);
    assertArgType(list, "list", "sum");
	return plus.apply(null, listToArray(list, true));
}

function minus() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "-");
	if (args.length == (1)) {
		return -args[0];
	} else {
		return args[0] - plus.apply(null, args.slice(1));
	}
}

function mult() {
	var args = args_to_array(arguments);
	var prod = 1;
	for (var i = 0; i < args.length; i++) {
		assertArgType(args[i], "number", "*");
		prod = prod * args[i];
	}
	return prod;
}

function div() {
	var args = args_to_array(arguments);
	assertAtLeastNumArgs(args, 1);
	assertArgType(args[0], "number", "/");
	if (args.length == (1)) {
		return 1 / args[0];
	} else {
		return args[0] / mult.apply(null, args.slice(1)); //FIXME: going to give wrong argTo for divisors...
	}
}

function and() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
        //FIXME: should check that types are boolean, or accept any truthy types?
		if (!args[i]) {
			return false;
		}
	}
	return true
}

function all(list) {
	assertNumArgs(args_to_array(arguments), 1);
    assertArgType(list, "list", "all");
	return and.apply(null, listToArray(list, true));
}

function or() {
	var args = args_to_array(arguments);
	for (var i = 0; i < args.length; i++) {
		if (args[i]) {
			return args[i];
		}
	}
	return false;
}

function not(x) {
	assertNumArgs(args_to_array(arguments), 1);
	return !x;
}

function cmp_nums(cmp_fn, args) {
	assertAtLeastNumArgs(args, 2)
	for (var i = 0; i < args.length - 1; i++) {
		assertArgType(args[i], "number", "comparison");
		if (!cmp_fn(args[i], args[i+1])) return false; 
	}
	return true;
}


function greater() {
	return cmp_nums(function(x, y) {return x > y;}, args_to_array(arguments));
}

function less() {
	return cmp_nums(function(x, y) {return x < y;}, args_to_array(arguments));
}

function geq() {
	return cmp_nums(function(x, y) {return x >= y;}, args_to_array(arguments));
}

function leq() {
	return cmp_nums(function(x, y) {return x <= y;}, args_to_array(arguments));
}

function eq() {
	return cmp_nums(function(x, y) {return x == y;}, args_to_array(arguments));
}

function is_null(x) {
	assertNumArgs(args_to_array(arguments), 1)
	return x == the_empty_list || (Array.isArray(x) && x.length == 0);
}

function list() {
	var args = args_to_array(arguments);
	var result = the_empty_list;
	for (var i = args.length-1; i >= 0; i--) {
		result = [args[i], result];
	}
	return result;
}

function is_list(list) {
	assertNumArgs(args_to_array(arguments), 1)
	if (Array.isArray(list)) {
		if (list.length == 0) {
			return true;
		} else {
			return is_list(list[1]);
		}
	} else {
		return false;
	}
}

function pair(a, b) {
	assertNumArgs(args_to_array(arguments), 2)
	return [a, b];
}

function is_pair(x) {
	assertNumArgs(args_to_array(arguments), 1);
	return x.length == 2;
}

function first(x) {
	assertNumArgs(args_to_array(arguments), 1);
	if (x.length != 2) {
		throw new Error(util.format_result(x) + " does not have required pair structure");
	} else {
		return x[0];
	}
}

function second(x) {
	return first(rest.apply(null, arguments));
}

function third(x) {
	assertList(x);
	return first(rest(rest(x)));
}

function fourth(x) {
	assertList(x);
	return first(rest(rest(rest(x))));
}

function fifth(x) {
	assertList(x);
	return first(rest(rest(rest(rest(x)))));
}

function sixth(x) {
	assertList(x);
	return first(rest(rest(rest(rest(rest(x))))));
}

function seventh(x) {
	assertList(x);
	return first(rest(rest(rest(rest(rest(rest(x)))))));
}

function list_ref(lst, n) {
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
}

function list_elt(lst, n) {
  return list_ref(lst, n - 1);  
}


function max(x) {
	var args = args_to_array(arguments);
	return Math.max.apply(Math, args);
}

function min(x) {
	var args = args_to_array(arguments);
	return Math.min.apply(Math, args);
}

function expt(a, b) {
	return Math.pow(a, b);
}

function mean(lst) {
	var vals = listToArray(lst),
      sum = 0,
      n = vals.length;
  
	for (var i=0; i < n; i++) {
    sum += vals[i];
  }
	return sum / n;
}

function append() {
	var args = args_to_array(arguments);
	return arrayToList([].concat.apply([], args.map(function(x) {
		assertArgType(x,"list","append");
		return listToArray(x);
	})));
}

function flatten(x) {
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
}

function fold(fn, initialValue, list) {
	assertArgType(fn,"function","fold");
	assertArgType(list, "list", "fold");
//	assertType(initialValue, "number");
	var arr = listToArray(list);
	var cumulativeValue = initialValue;
	for (var i=0; i<arr.length; i++) {
	  cumulativeValue = fn(arr[i], cumulativeValue);
	}
	return cumulativeValue;
}

function repeat(n,fn) {
    assertArgType(fn, "function", "repeat");
    assertArgType(n, "number", "repeat");
	var ret = [];
	for(var i=0;i<n;i++) {ret[i] = fn()}
	return arrayToList(ret);
}

function map() {
  var args = args_to_array(arguments),
      fn = args[0];

  assertArgType(fn, "function", "map");
    
  var lists = args.slice(1),
      arr = [];

  
  var arrays = lists.map(listToArray),
      n = Math.min.apply(this, arrays.map(function(a) { return a.length}));
  
  
	for(var i=0;i<n;i++) {
		arr[i] = fn.apply(this, arrays.map(function(L) { return L[i]}));
	}

	return arrayToList(arr);
}

//function sample(fn) {return fn()}

function rest(x) {
	assertNumArgs(args_to_array(arguments), 1);
	if (x.length != 2) {
		throw new Error("Argument does not have required pair structure");
	} else {
		return x[1];
	}
}

function length(x) {
	assertNumArgs(args_to_array(arguments), 1);
    assertArgType(x, "list", "length")
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
}

// predefine the length, decently quick and
// not so complicated as recursive merge
// http://jsperf.com/best-init-array/3
function make_list(n, x) {
	assertNumArgs(args_to_array(arguments), 2);
	assertArgType(n, "integer", "make-list");
	if (n == 0) return the_empty_list;
	var results = new Array(n);

	for (var i = 0; i < n; i += 1) {
		results[i] = x;
	}
	return arrayToList(results);
}

function is_eq(x, y) {
	assertNumArgs(args_to_array(arguments), 2);
	return typeof(x) == typeof(y) && x == y;
}

function is_equal(x, y) {
	assertNumArgs(args_to_array(arguments), 2);
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
		return false
	}
}

function member_base(x, list, eq_fn) {
	assertArgType(list,"list","member");
	if (list.length == 0) {
		return false;
	} else if (eq_fn(x, list[0])) {
		return list;
	} else {
		return member_base(x, list[1], eq_fn);
	}
}

function member(x, list) {
	assertNumArgs(args_to_array(arguments), 2);
	return member_base(x, list, is_equal);
}

function apply(fn, list) {
	assertArgType(fn,"function","apply");
	assertArgType(list,"list","apply");
	return fn.apply(null, listToArray(list, false));
}

function wrapped_uniform_draw(items) {
	assertArgType(items,"list","uniform-draw");
	return uniformDraw(listToArray(items, false), false);
}

function wrapped_multinomial(items, probs) {
	assertArgType(items,"list","multinomial");
	assertArgType(probs,"list","multinomial");
	if (items.length != probs.length) {
		throw new Error("Lists of items and probabilities must be of equal length");
	}
	return multinomialDraw(listToArray(items, false), listToArray(probs), null);
}

function wrapped_flip(p, isStructural, conditionedValue) {
	return flip(p, isStructural, conditionedValue) == 1;
}

function wrapped_uniform(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertArgType(a, "number", "uniform");
	assertArgType(b, "number", "uniform");
	return uniform(a, b, isStructural, conditionedValue);
}

function wrapped_random_integer(n) {
	assertNumArgs(args_to_array(arguments), 1);
	assertArgType(n, "number", "random integer");
	return Math.floor(uniform(0, 1, false, null) * n); //FIXME: this results in a continuous ERP when it should be discrete. use multinomial or uniformDraw...
}

function wrapped_gaussian(mu, sigma, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertArgType(mu, "number", "gaussian");
	assertArgType(sigma, "number", "gaussian");
	return gaussian(mu, sigma, isStructural, conditionedValue);
}

function wrapped_gamma(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertArgType(a, "number", "gamma");
	assertArgType(b, "number", "gamma");
	return gamma(a, b, isStructural, conditionedValue);
}

function wrapped_beta(a, b, isStructural, conditionedValue) {
	assertNumArgsMulti(args_to_array(arguments), [2, 4]);
	assertArgType(a, "number", "beta");
	assertArgType(b, "number", "beta");
	return beta(a, b, isStructural, conditionedValue);
}

function wrapped_dirichlet(alpha) {
	assertNumArgs(args_to_array(arguments), 1);
	assertArgType(alpha, "list", "dirichlet");
	assertAllType(alpha, "number", "dirichlet");
	alpha = listToArray(alpha, true);
	return arrayToList(dirichlet(alpha, false, null));
}

function wrapped_traceMH(comp, samples, lag) {
	var inn = traceMH(comp, samples, lag, false, "lessdumb").map(function(x) {return x.sample});
	var res = arrayToList(inn);
	return res;
}

function wrapped_enumerate(comp) {
	var d = enumerateDist(comp);
	var p=[],v=[];
	var norm = 0;
	for (var x in d) {
		p.push(d[x].prob)
		v.push(d[x].val)
		norm += d[x].prob
	}
	var res = list(arrayToList(v), arrayToList(p.map(function(x){return x/norm})));
	return res;
}

function wrapped_evaluate(code) {
    //need to turn the code list back into a string before calling the webchurch evaluate...
    code = util.format_result(code)
    return evaluate(code)
}

//dummy hist for testing
function hist(x) {
	return x;
}

function listToArray(list, recurse) {
	var array = [];
	while (list.length > 0) {
		var left = list[0];
		array.push((Array.isArray(left) && recurse) ? listToArray(left) : left);
		list = list[1];
	}
	return array;
}

function arrayToList(arr) {
	if (arr.length == 0) {
		return the_empty_list;
	} else {
	var i = arr.length, r = [];
	while (i--) {
	  r = [arr[i], r];
	}
	return r;
	}
}


///Asserts for checking arguments to functions.
///FIXME: if we turn these off, does code go much faster?

function assertArgType(x, type, argTo) {
    argTo = (argTo == 'undefined')? '"' : '" to ' + argTo
    switch(type) {
        case "function":
            if (typeof(x) != 'function') {
                //doesn't say "is not a function" to avoid special purpose code in evaluate.js
                throw new Error('argument "' + util.format_result(x) + argTo  + ' not a function');}
            break;
            
        case "integer":
            if (typeof(x) != "number" && parseInt(n) != n) {
                throw new Error('"' + util.format_result(n) + argTo + '" is not an integer');
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

function assertNumArgs(args, n) {
	if (args.length != n) {
		throw new Error("Wrong number of arguments, expected " + n + ", got " + args.length);
	}
}

function assertNumArgsMulti(args, choices) {
	if (choices.indexOf(args.length) < 0) {
		throw new Error("Wrong number of arguments, expected " + choices.join(" or ") + ", got " + args.length);
	}
}

function assertAtLeastNumArgs(args, n) {
	if (args.length < n) {
		throw new Error("Too few arguments, expected at least " + n + ", got " + args.length);
	}
}

module.exports = {
	the_empty_list: the_empty_list,

	plus: plus,
	sum: sum,
	minus: minus,
	mult: mult,
	div: div,
	greater: greater,
	less: less,
	geq: geq,
	leq: leq,
	eq: eq,

	and: and,
    all: all,
	or: or,
	not: not,

	is_null: is_null,
	list: list,
	is_list: is_list,
	pair: pair,
	is_pair: is_pair,
	first: first,
	second: second,
	third: third,
	fourth: fourth,
	fifth: fifth,
	sixth: sixth,
	seventh: seventh,
	max: max,
	min: min,
	expt: expt,
	mean: mean,
	append: append,
	flatten: flatten,
	rest: rest,
	length: length,
	make_list: make_list,
	is_eq: is_eq,
	is_equal: is_equal,
	member: member,
    list_ref: list_ref,
    list_elt: list_elt, 
	apply: apply,
	
	fold: fold,
	repeat: repeat,
	map: map,
	// sample: sample,
    wrapped_evaluate: wrapped_evaluate,

	wrapped_uniform_draw: wrapped_uniform_draw,
	wrapped_multinomial: wrapped_multinomial,
	wrapped_flip: wrapped_flip,
	wrapped_uniform: wrapped_uniform,
	wrapped_random_integer: wrapped_random_integer,
	wrapped_gaussian: wrapped_gaussian,
    wrapped_beta: wrapped_beta,
	wrapped_dirichlet: wrapped_dirichlet,
	wrapped_traceMH: wrapped_traceMH,
	wrapped_enumerate: wrapped_enumerate,
	

	// Utility functions, not exposed to Church
	args_to_array: args_to_array,
	args_to_list: args_to_list,
	arrayToList: arrayToList,
	hist: hist
}
