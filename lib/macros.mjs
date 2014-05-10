#metamodule
  #keepmacro ?
    arity: post
    precedence: MEMBER
    expand: (val) ->
      var result = `do
        var \val = ~`val
        if (typeof \val != 'undefined')
          true
        else
          false
      result.resolveVirtual()
      result

  #keepmacro |>
    arity: binary
    precedence: LOW
    expand: (start, exprs) ->

      var inspect = (require 'util').inspect

      var named-exprs = Object.create(null)
      var exprs-data = []

      var new-data = (expr, name) -> {
          expr: expr
          name: name
          first-occurrences: []
          occurrences: []
          previous: null
          next: null
        }

      var analyze-expr = (expr) -> do!
        var data =
          if (expr.property?())
            if ((expr.at 0).tag?()) do
              var property-name = (expr.at 0).getTag()
              if (named-exprs[property-name]?) do
                var property-data = named-exprs[property-name]
                if (property-data.expr != null)
                  expr.error 'Redefined named expression'
                else
                  property-data.expr = expr.at 1
                property-data
              else do
                expr.error 'Named expression defined before use'
                new-data(expr.at 1, null)
            else do
              (expr.at 0).error 'Invalid expression name'
              new-data(expr.at 1, null)
          else
            new-data(expr, null)
        data.expr.for-each-recursive
          ph -> do! if (ph.placeholder?())
            var ph-value = ph.get-simple-value()
            if (ph-value == null || ph-value == '<:')
              if (data.previous == null)
                data.previous = ph
              else
                ph.error 'More than one <: reference specified'
            else if (ph-value == ':>')
              if (data.next == null)
                data.next = ph
              else
                ph.error 'More than one :> reference specified'
            else if (ph-value.substring(0, 2) == '##')
              var name = ph-value.substring(2)
              var named-data =
                if (named-exprs[name]?)
                  named-exprs[name]
                else do
                  var d = new-data(null, name)
                  data.first-occurrences.push name
                  named-exprs[name] = d
              named-data.occurrences.push ph
        if (data.name == null)
          ;console.log <- ' *** DATA: ' + inspect data
          exprs-data.push data

      if (!start.placeholder?())
        analyze-expr start
      if (exprs.tuple?())
        exprs.for-each analyze-expr
      else
        analyze-expr exprs

      var results = []
      var previous = null
      var next-reference = null
      var last = null
      while (exprs-data.length > 0)
        var current = exprs-data.shift()
        ;console.log <- ' *** LOOP: current ' + current
        console.log <- ' *** LOOP: expr ' + current.expr.print-ast()
        ;console.log <-
        if (previous != null && previous.next != null)
          console.log <- ' *** *** current goes into previous'
          if (current.previous != null)
            current.previous.error 'Cannot have a # reference if the previous expression has a :> reference'
          previous.next.replace-with(current.expr)
          last = previous
        else
          if (current.previous != null)
            console.log <- ' *** ***  previous goes into current'
            if (last != null)
              current.previous.replace-with(last.expr)
            else
              current.previous.error 'Cannot have a <: reference with no previous expression'
          else
            console.log <- ' *** ***  no link'
            if (previous != null)
              results.push <- previous.expr
          last = current
        previous = current
      if (last != null)
        results.push <- last.expr

      var result =
        if (results.length == 1)
          results[0]
        else
          ` do! ~` results
      console.log <- 'RESULT: ' + result.print-ast()
      result
