var ditto, last, o, bnf, operators, name, alts, alt, token, tokens;
ditto = {};
last = '';
o = function(patterns, action, options){
  patterns = patterns.trim().split(/\s+/);
  action && (action = action === ditto
    ? last
    : (action + "").replace(/^function\s*\(\)\s*\{\s*return\s*([\s\S]*);\s*\}/, '$$$$ = $1;').replace(/\b(?!Er)[A-Z][\w.]*/g, 'yy.$&').replace(/\.L\(/g, '$&yylineno, '));
  return [patterns, last = action || '', options];
};
bnf = {
  Chain: [
    o('ID', function(){
      return Chain(L(Var($1)));
    }), o('Parenthetical', function(){
      return Chain($1);
    }), o('List', ditto), o('STRNUM', function(){
      return Chain(L(Literal($1)));
    }), o('LITERAL', ditto), o('Chain DOT Key', function(){
      return $1.add(Index($3, $2, true));
    }), o('Chain DOT List', ditto), o('Chain CALL( ArgList OptComma )CALL', function(){
      return $1.add(Call($3));
    }), o('Chain ?', function(){
      return Chain(Existence($1.unwrap()));
    }), o('LET CALL( ArgList OptComma )CALL Block', function(){
      return Chain(Call['let']($1, $3, $6));
    }), o('WITH Expression Block', function(){
      return Chain(Call.block(Fun([], $3), [$2], '.call'));
    })
  ],
  List: [
    o('[ ArgList    OptComma ]', function(){
      return L(Arr($2));
    }), o('{ Properties OptComma }', function(){
      return L(Obj($2));
    }), o('[ ArgList    OptComma ] LABEL', function(){
      return L(Arr($2)).named($5);
    }), o('{ Properties OptComma } LABEL', function(){
      return L(Obj($2)).named($5);
    })
  ],
  Key: [o('KeyBase'), o('Parenthetical')],
  KeyBase: [
    o('ID', function(){
      return L(Key($1));
    }), o('STRNUM', function(){
      return L(Literal($1));
    })
  ],
  ArgList: [
    o('', function(){
      return [];
    }), o('Arg', function(){
      return [$1];
    }), o('ArgList , Arg', function(){
      return $1.concat($3);
    }), o('ArgList OptComma NEWLINE Arg', function(){
      return $1.concat($4);
    }), o('ArgList OptComma INDENT ArgList OptComma DEDENT', ditto)
  ],
  Arg: [
    o('Expression'), o('... Expression', function(){
      return Splat($2);
    }), o('...', function(){
      return Splat(L(Arr()), true);
    })
  ],
  OptComma: [o(''), o(',')],
  Lines: [
    o('', function(){
      return Block();
    }), o('Line', function(){
      return Block($1);
    }), o('Lines NEWLINE Line', function(){
      return $1.add($3);
    }), o('Lines NEWLINE')
  ],
  Line: [
    o('Expression'), o('PARAM( ArgList OptComma )PARAM <- Expression', function(){
      return Call.back($2, $6, $5 === '<~');
    }), o('COMMENT', function(){
      return L(JS($1, true, true));
    }), o('...', function(){
      return L(Throw(JS("Error('unimplemented')")));
    })
  ],
  Block: [o('INDENT Lines DEDENT', function(){
    return $2.chomp();
  })],
  Expression: [
    o('Chain', function(){
      return $1.unwrap();
    }), o('Chain ASSIGN Expression', function(){
      return Assign($1.unwrap(), $3, $2);
    }), o('Chain ASSIGN INDENT ArgList OptComma DEDENT', function(){
      return Assign($1.unwrap(), Arr.maybe($4), $2);
    }), o('Expression IMPORT Expression', function(){
      return Import($1, $3, $2 === '<<<<');
    }), o('Expression IMPORT INDENT ArgList OptComma DEDENT', function(){
      return Import($1, Arr.maybe($4), $2 === '<<<<');
    }), o('CREMENT Chain', function(){
      return Unary($1, $2.unwrap());
    }), o('Chain CREMENT', function(){
      return Unary($2, $1.unwrap(), true);
    }), o('UNARY ASSIGN Chain', function(){
      return Assign($3.unwrap(), [$1], $2);
    }), o('+-    ASSIGN Chain', ditto), o('^     ASSIGN Chain', ditto), o('UNARY Expression', function(){
      return Unary($1, $2);
    }), o('+-    Expression', ditto, {
      prec: 'UNARY'
    }), o('^     Expression', ditto, {
      prec: 'UNARY'
    }), o('Expression +-      Expression', function(){
      return Binary($2, $1, $3);
    }), o('Expression ^       Expression', ditto), o('Expression COMPARE Expression', ditto), o('Expression LOGIC   Expression', ditto), o('Expression MATH    Expression', ditto), o('Expression SHIFT   Expression', ditto), o('Expression BITWISE Expression', ditto), o('Expression RELATION Expression', function(){
      return '!' === $2.charAt(0)
        ? Binary($2.slice(1), $1, $3).invert()
        : Binary($2, $1, $3);
    }), o('Expression => Expression', function(){
      return Block($1).pipe($3);
    }), o('Chain !?', function(){
      return Existence($1.unwrap(), true);
    }), o('PARAM( ArgList OptComma )PARAM -> Block', function(){
      return L(Fun($2, $6, $5 === '~>'));
    }), o('FUNCTION CALL( ArgList OptComma )CALL Block', function(){
      return L(Fun($3, $6).named($1));
    }), o('IfBlock'), o('IfBlock ELSE Block', function(){
      return $1.addElse($3);
    }), o('Expression POST_IF Expression', function(){
      return If($3, $1, $2 === 'unless');
    }), o('LoopHead Block', function(){
      return $1.addBody($2);
    }), o('LoopHead Block ELSE Block', function(){
      return $1.addBody($2).addElse($4);
    }), o('Expression LoopHead', function(){
      return $2.addBody(Block($1));
    }), o('DO Block WHILE Expression', function(){
      return new While($4, $3 === 'until', true).addBody($2);
    }), o('HURL Expression', function(){
      return Jump[$1]($2);
    }), o('HURL INDENT ArgList OptComma DEDENT', function(){
      return Jump[$1](Arr.maybe($3));
    }), o('HURL', function(){
      return L(Jump[$1]());
    }), o('JUMP', function(){
      return L(new Jump($1));
    }), o('JUMP ID', function(){
      return L(new Jump($1, $2));
    }), o('SWITCH Expression Cases', function(){
      return new Switch($2, $3);
    }), o('SWITCH Expression Cases DEFAULT Block', function(){
      return new Switch($2, $3, $5);
    }), o('SWITCH            Cases', function(){
      return new Switch(null, $2);
    }), o('SWITCH            Cases DEFAULT Block', function(){
      return new Switch(null, $2, $4);
    }), o('SWITCH                          Block', function(){
      return new Switch(null, [], $2);
    }), o('TRY Block', function(){
      return new Try($2);
    }), o('TRY Block CATCH Block', function(){
      return new Try($2, $3, $4);
    }), o('TRY Block CATCH Block FINALLY Block', function(){
      return new Try($2, $3, $4, $6);
    }), o('TRY Block             FINALLY Block', function(){
      return new Try($2, null, null, $4);
    }), o('CLASS                          Block', function(){
      return new Class(null, null, $2);
    }), o('CLASS       EXTENDS Expression Block', function(){
      return new Class(null, $3, $4);
    }), o('CLASS Chain                    Block', function(){
      return new Class($2.unwrap(), null, $3);
    }), o('CLASS Chain EXTENDS Expression Block', function(){
      return new Class($2.unwrap(), $4, $5);
    }), o('Chain EXTENDS Expression', function(){
      return Util.Extends($1.unwrap(), $3);
    }), o('LABEL Expression', function(){
      return new Label($1, $2);
    }), o('LABEL Block', ditto)
  ],
  KeyValue: [
    o('Key'), o('LITERAL DOT KeyBase', function(){
      return Prop($3, Chain(Literal($1), [Index($3, $2)]));
    }), o('Key     DOT KeyBase', function(){
      return Prop($3, Chain($1, [Index($3, $2)]));
    })
  ],
  Property: [
    o('Key : Expression', function(){
      return Prop($1, $3);
    }), o('Key : INDENT ArgList OptComma DEDENT', function(){
      return Prop($1, Arr.maybe($4));
    }), o('KeyValue'), o('KeyValue LOGIC Expression', function(){
      return Binary($2, $1, $3);
    }), o('+- Key', function(){
      return Prop($2.maybeKey(), Literal($1 === '+'));
    }), o('... Expression', function(){
      return Splat($2);
    }), o('COMMENT', function(){
      return L(JS($1, true, true));
    })
  ],
  Properties: [
    o('', function(){
      return [];
    }), o('Property', function(){
      return [$1];
    }), o('Properties , Property', function(){
      return $1.concat($3);
    }), o('Properties OptComma NEWLINE Property', function(){
      return $1.concat($4);
    }), o('Properties OptComma INDENT Properties OptComma DEDENT', ditto)
  ],
  Parenthetical: [o('( Body )', function(){
    return Parens($2.chomp().unwrap(), false, $1 === '"');
  })],
  Body: [
    o('Lines'), o('Block'), o('Block NEWLINE Lines', function(){
      return $1.add($3);
    })
  ],
  IfBlock: [
    o('IF Expression Block', function(){
      return If($2, $3, $1 === 'unless');
    }), o('IfBlock ELSE IF Expression Block', function(){
      return $1.addElse(If($4, $5, $3 === 'unless'));
    })
  ],
  LoopHead: [
    o('FOR Chain OF Expression', function(){
      return new For({
        item: $2.unwrap(),
        index: $3,
        source: $4
      });
    }), o('FOR Chain OF Expression BY Expression', function(){
      return new For({
        item: $2.unwrap(),
        index: $3,
        source: $4,
        step: $6
      });
    }), o('FOR     ID         IN Expression', function(){
      return new For({
        object: true,
        index: $2,
        source: $4
      });
    }), o('FOR     ID , Chain IN Expression', function(){
      return new For({
        object: true,
        index: $2,
        item: $4.unwrap(),
        source: $6
      });
    }), o('FOR OWN ID         IN Expression', function(){
      return new For({
        object: true,
        own: true,
        index: $3,
        source: $5
      });
    }), o('FOR OWN ID , Chain IN Expression', function(){
      return new For({
        object: true,
        own: true,
        index: $3,
        item: $5.unwrap(),
        source: $7
      });
    }), o('FOR ID FROM Expression TO Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6
      });
    }), o('FOR ID FROM Expression TO Expression BY Expression', function(){
      return new For({
        index: $2,
        from: $4,
        op: $5,
        to: $6,
        step: $8
      });
    }), o('WHILE Expression', function(){
      return new While($2, $1 === 'until');
    }), o('WHILE Expression , Expression', function(){
      return new While($2, $1 === 'until', $4);
    })
  ],
  Cases: [
    o('CASE Exprs Block', function(){
      return [new Case($2, $3)];
    }), o('Cases CASE Exprs Block', function(){
      return $1.concat(new Case($3, $4));
    })
  ],
  Exprs: [
    o('Expression', function(){
      return [$1];
    }), o('Exprs , Expression', function(){
      return $1.concat($3);
    })
  ]
};
operators = [['left', '=>', 'POST_IF', 'FOR', 'WHILE'], ['right', ',', 'ASSIGN', 'HURL', 'EXTENDS', 'INDENT', 'SWITCH', 'CASE', 'TO', 'BY', 'LABEL'], ['right', 'LOGIC'], ['left', '^', 'BITWISE'], ['right', 'COMPARE'], ['left', 'RELATION'], ['left', 'SHIFT', 'IMPORT'], ['left', '+-'], ['left', 'MATH'], ['right', 'UNARY'], ['nonassoc', 'CREMENT']];
tokens = (function(){
  var __ref, __i, __ref1, __len, __j, __ref2, __len1, __results = [];
  for (name in __ref = bnf) {
    alts = __ref[name];
    for (__i = 0, __len = (__ref1 = alts).length; __i < __len; ++__i) {
      alt = __ref1[__i];
      for (__j = 0, __len1 = (__ref2 = alt[0]).length; __j < __len1; ++__j) {
        token = __ref2[__j];
        if (!(token in bnf)) {
          __results.push(token);
        }
      }
    }
  }
  return __results;
}()).join(' ');
bnf.Root = [[['Body'], 'return $$']];
module.exports = new (require('jison')).Parser({
  bnf: bnf,
  operators: operators,
  tokens: tokens,
  startSymbol: 'Root'
});