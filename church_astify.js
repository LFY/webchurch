var util = require('./util.js');

var brackets_map = {"(": ")", "[": "]"}

function make_generic_node(head, children) {
	return {"head": head, "children": children};
}

function deep_copy(obj) { return JSON.parse(JSON.stringify(obj)); }

// TODO: add all kinds of error-checking.
function church_astify(tokens) {
	// astify changes the opening bracket tokens so the end site is the matching closing bracket
	function astify(tokens) {

		function helper(opening_bracket) {
			// Tree nodes have keys [children, start, end]
			var result = {children: [], start: opening_bracket ? opening_bracket.start : "1:1"};
			while (tokens.length > 0) {
				if (tokens[0].text == "(" || tokens[0].text == "[") {
					var bracket = tokens[0];
					storage.push(tokens.shift());
					result.children.push(helper(bracket));
				} else if (tokens[0].text == ")" || tokens[0].text == "]") {
					if (!opening_bracket || tokens[0].text != brackets_map[opening_bracket.text]) {
						throw util.make_church_error("SyntaxError", tokens[0].start, tokens[0].end, "Unexpected close parens");
					} else {
						result["end"] = tokens[0].start;
						opening_bracket.end = tokens[0].start;
						storage.push(tokens.shift());
						return result;
					}
				} else {
					var token = tokens.shift();
					storage.push(token);
					result.children.push(token);
				}
			}
			if (!opening_bracket) {
				return result;
			} else {
				throw util.make_church_error("SyntaxError", opening_bracket.start, opening_bracket.end, "Unclosed parens");
			}
		}
		var storage = []
		var ast = helper();
		for (var i = 0; i < storage.length; i++) {
			tokens.push(storage[i]);
		}
		return ast;
	}

	function traverse(ast, fn) {
		if (!util.is_leaf(ast) && ast.children.length > 0) {
			ast = fn(ast);
			for (var i = 0; i < ast.children.length; i++) {
				ast.children[i] = traverse(ast.children[i], fn);
			}
		}
		return ast;
	}

	function is_special_form(text) {
		return ["define", "lambda", "case", "cond", "if", "let"].indexOf(text) != -1;
	}

	function assert_not_special_form(node) {
		if (is_special_form(node.text)) {
			throw util.make_church_error("SyntaxError", node.start, node.end, "Special form " + node.text + " cannot be used as an atom");
		}
	}

	function validate_leaves(ast) {
		for (var i = 1; i < ast.children.length; i++) {
			assert_not_special_form(ast.children[i]);
		}
		return ast;
	}

	// NOTE: Many of the desugar functions don't add range information.
	// For now, it seems unlikely they'll be needed.

	function dsgr_define(ast) {
		if (ast.children[0].text=="define") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "Invalid define");
			}
			// Function define sugar
			if (!util.is_leaf(ast.children[1])) {
				var lambda = {
					children: [
						{text: "lambda"},
						{children: ast.children[1].children.slice(1)}
					].concat(ast.children.slice(2))
				};
				return {
					children: [ast.children[0], ast.children[1].children[0], lambda],
					start: ast.start,
					end: ast.end
				}
			}
		}
		return ast;
	}

	function dsgr_lambda(ast) {
		if (ast.children[0].text=="lambda") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "lambda has no body");
			}
		}
		return ast;
	}

	function dsgr_let(ast) {
		if (ast.children[0].text=="let") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "let has no body");
			}
			var bindings = ast.children[1];
			var valid_bindings = true;
			if (util.is_leaf(bindings)) {
				valid_bindings = false;
			} else {
				for (var i = 0; i < bindings.children.length; i++) {
					if (util.is_leaf(bindings.children[i]) || bindings.children[i].children.length != 2) {
						valid_bindings = false;
						break;
					}
				}
			}
			if (!valid_bindings) {
				throw util.make_church_error_range("SyntaxError", bindings.start, bindings.end, "let has invalid bindings");
			}

			return {
				children: [
					{
						children: [
							{text: "lambda"},
							bindings.children.map(function(x) {return x.children[0]}),
							ast.children[2]
						]
					}
				].concat(bindings.children.map(function(x) {return x.children[1]}))
			}

			;
		} else {
			return ast;
		}
	}

	function dsgr_quote(ast) {
		var last = ast.children[ast.children.length-1];
		if (last.text=="'") {
			throw util.make_church_error("SyntaxError", last.start, last.end, "Invalid single quote")
		}
		for (var i = ast.children.length - 2; i >= 0; i--) {
			if (ast.children[i].text == "'") {
				ast.children.splice(i, 2, {
					children: [{text: "quote", start: ast.children[i].start, end: ast.children[i].end}, ast.children[i+1]],
					start: ast.children[i].start,
					end: ast.children[i+1].end
				})
			}
		}
		return ast;
	}

	function dsgr_case(ast) {
		function case_helper(key, clauses) {
			if (clauses.length == 0) {
				return undefined;
			}
			var clause = clauses[0];
			if (util.is_leaf(clause) || clause.children.length != 2 ||
				(util.is_leaf(clause.children[0]) && clause.children[0].text!="else")) {
				throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad clause for case");
			}

			if (clause.children[0].text=="else") {
				if (clauses.length > 1) {
					throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad placement of else clause in case");
				} else {
					return clause.children[1];
				}
			} else {
				for (var i = 0; i < clause.children[0]; i++) {
					var datum = clause.children[0].children[i];
					if (util.is_leaf(datum)) {
						throw util.make_church_error("SyntaxError", datum.start, datum.end, " for case");
					}
				}

				var next = case_helper(key, clauses.slice(1));
				var new_ast = {
					children: [
						{text: "if"},
						{
							children: [
								{text: "member"},
								key,
								{children: [{text: "quote"}].concat(clause.children[0])}
							]
						},
						clause.children[1],
					]
				};
				if (next) {
					new_ast.children.push(next);
				}
				return new_ast;
			}
		}

		if (ast.children[0].text=="case") {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "case is missing clauses");
			}
			return case_helper(ast.children[1], ast.children.slice(2));
		} else {
			return ast;
		}
	}

	function dsgr_cond(ast) {
		function cond_helper(clauses) {
			if (clauses.length == 0) {
				return undefined;
			}
			var clause = clauses[0];
			if (util.is_leaf(clause) || clause.children.length != 2) {
				throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad clause for cond");
			}
			if (clause.children[0].text=="else") {
				if (clauses.length > 1) {
					throw util.make_church_error("SyntaxError", clause.start, clause.end, "Bad placement of else clause in cond");
				} else {
					return clause.children[1];
				}
			} else {
				var next = cond_helper(
					clauses.slice(1));
				new_ast = {
					children: [
						{text: "if"},
						clause.children[0],
						clause.children[1],
					]
				}
				if (next) {
					new_ast.children.push(next);
				}
				return new_ast;
			}
		}

		if (ast.children[0].text=="cond") {
			if (ast.children.length < 2) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, "cond is missing clauses");
			}
			return cond_helper(ast.children.slice(1));
		} else {
			return ast;
		}
	}

	function dsgr_query(ast) {
		// Makes the lambda that's passed to the query function
		function query_helper(statements, condition, args) {
			if (util.is_leaf(condition) ||
                (condition.children[0].text != "condition" && condition.children[0].text != "factor")) {
				condition = {
					children: [{text: "condition"}, condition],
					start: condition.start,
					end: condition.end
				}
			}
			args = args || {children: []}
			return {
				children: [
					{text: "lambda"},
					args,
				].concat(statements.slice(0, -1)).concat(condition).concat(statements[statements.length-1])
			};
		}
		
		if (["rejection-query", "enumeration-query"].indexOf(ast.children[0].text) != -1) {
			if (ast.children.length < 3) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, ast.children[0].text + " has the wrong number of arguments");
			}
			return {
				children: [
					ast.children[0],
					query_helper(ast.children.slice(1, -1), ast.children[ast.children.length-1])
				],
				start: ast.start,
				end: ast.end
			};
		}
		if (["mh-query"].indexOf(ast.children[0].text) != -1) {
			if (ast.children.length < 5) {
				throw util.make_church_error("SyntaxError", ast.start, ast.end, ast.children[0].text + " has the wrong number of arguments");
			}
			return {
				children: [
					ast.children[0],
					query_helper(ast.children.slice(3, -1), ast.children[ast.children.length-1])
				].concat(ast.children.slice(1, 3)),
				start: ast.start,
				end: ast.end
			};
		}
		return ast;
	}
 
	// Order is important, particularly desugaring quotes before anything else.
	var desugar_fns = [validate_leaves, dsgr_quote, dsgr_define, dsgr_lambda, dsgr_let, dsgr_case, dsgr_cond, dsgr_query];

	var ast = astify(tokens);
	// Special top-level check
	for (var i = 0; i < ast.children.length; i++) {
		assert_not_special_form(ast.children[i]);
	}
	for (var i = 0; i < desugar_fns.length; i++) {
		ast = traverse(ast, desugar_fns[i]);
	}

	return ast;
}


exports.church_astify = church_astify;