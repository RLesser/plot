import {brush as brusher, brushX as brusherX, brushY as brusherY, create, extent} from "d3";
import {filter} from "../defined.js";
import {Mark, identity, first, second} from "../mark.js";
import {Style} from "../style.js";
const {max, min} = Math;

export class Brush extends Mark {
  constructor(
    data,
    {
      x = first,
      y = second,
      selection,
      transform,
      ...style
    } = {}
  ) {
    super(
      data,
      [
        {name: "picker", value: identity},
        {name: "x", value: x, optional: true},
        {name: "y", value: y, optional: true}
      ],
      transform
    );
    Style(this, style);
    this.initialSelection = selection;
  }
  render(
    I,
    {x, y},
    {x: X, y: Y, picker: J},
    {marginLeft, width, marginRight, marginTop, height, marginBottom}
  ) {
    let svg;
    const g = create("svg:g");
    const data = this.data;

    const bounds = [
      [Math.floor(marginLeft), Math.floor(marginTop)],
      [Math.ceil(width - marginRight), Math.ceil(height - marginBottom)]
    ];
    const brush = (x && y ? brusher : x ? brusherX : brusherY)()
      .extent(bounds)
      .on("start brush end", ({type, selection, sourceEvent}) => {
        let index = filter(I, X, Y);
        if (selection) {
          if (x) {
            const [x0, x1] = y ? [selection[0][0], selection[1][0]] : selection;
            index = index.filter(i => {
              const c = x(X[i]);
              return c >= x0 && c <= x1;
            });
          }
          if (y) {
            const [y0, y1] = x ? [selection[0][1], selection[1][1]] : selection;
            index = index.filter(i => {
              const c = y(Y[i]);
              return c >= y0 && c <= y1;
            });
          }
        }
        const dots = selection ? Array.from(index, i => J[i]) : data;
      
        if (svg) {
          svg.value = dots;
          svg.dispatchEvent(new CustomEvent('input'));
          if (sourceEvent && type === "start") {
            for (const {b, g} of svg.__brushes) {
              if (b !== brush) g.call(b.clear);
            }
          }
        }
      });
  
    g.call(brush);
    
    /* 🌶 async
     * wait for the ownerSVGElement to:
     * - send the first signal
     * - register the multiple brushes (for faceting) 
     */
    setTimeout(() => {
      svg = g.node().ownerSVGElement;
      if (!svg.__brushes) svg.__brushes = [];
      svg.__brushes.push({b: brush, g});

      // initial setup works only on one facet
      if (svg.__brushes.length === 1) {
        if (this.initialSelection) {
          const s = this.initialSelection;
          if (x && y) {
            const [x0, x1] = extent([x(s[0][0]), x(s[1][0])]);
            const [y0, y1] = extent([y(s[0][1]), y(s[1][1])]);
            g.call(brush.move, [
              [ max(x0, bounds[0][0]), max(y0, bounds[0][1]) ],
              [ min(x1, bounds[1][0]), min(y1, bounds[1][1]) ]
            ]);
          } else if (x) {
            const [x0, x1] = extent(s.map(x));
            g.call(brush.move, [ max(x0, bounds[0][0]), min(x1, bounds[1][0]) ]);
          } else if (y) {
            const [y0, y1] = extent(s.map(y));
            g.call(brush.move, [ max(y0, bounds[0][1]), min(y1, bounds[1][1]) ]);
          }
        } else {
          g.call(brush.clear);
        }
      }
    }, 1);
  
    return g.node();
  }
}

export function brush(data, options) {
  return new Brush(data, options);
}

export function brushX(data, {x = identity, ...options} = {}) {
  return new Brush(data, {...options, x, y: null});
}

export function brushY(data, {y = identity, ...options} = {}) {
  return new Brush(data, {...options, x: null, y});
}
