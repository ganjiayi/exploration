/**
 * EPS mould: a block moulding machine for expanded polystyrene. A long steel
 * mould box with stiffening ribs stands on legs, feed guns on its roof and a
 * steam manifold along its side. At its end a hydraulic gantry lifts the door,
 * and a roller table waits to take the moulded block.
 *
 * The pointer's place along the machine works the unload, on one spring: over
 * the body the door stays shut, nearer the end it lifts, and past the end the
 * white block follows it out onto the rollers. The slider is the reach, in
 * metres: how far the block may come out.
 */
const {
  Cam, circ, clamp, facing, fit, poly, prism, proj, rings, seg, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

const U = 12;                                   // world units to a metre
const XE = 80, BW = 22, Z0 = 11, Z1 = 35;       // the mould box: x 0..XE, y 0..BW, z Z0..Z1
const BY0 = 3, BY1 = 19, BZ0 = 14, BZ1 = 32;    // the block's section
const LIFT = 22, DS = 26;                       // the door's travel, and the pointer travel that lifts it
const TX0 = 84, TX1 = 138, TZ = 14;             // the roller table
const HZ = 23;                                  // the plane the pointer is read on: the box's middle height

/** A circle of radius R round (cx, cy), as a ring. */
const disc = (cx, cy, R) => circ(R, 20).map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value * U;
  const C = Cam(45, 0.5, 2.0);
  fit(C, [[-6, -6, -3], [146, 28, -3], [146, -6, -3], [-6, 28, -3], [82, -4, 74], [82, 26, 74], [0, 0, 42]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);
  const box = (x0, y0, x1, y1, z0, z1, r, b, parent = g) => {
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    const s = solid(parent);
    put(s, prism(P, front, ring, inner, z0, z1));
    return s;
  };
  const lines = (d, cls = "nf lo") => mk("path", { d, class: cls }, g);
  const cyl = (cx, cy, R, z0, z1) => put(solid(g), prism(P, front, disc(cx, cy, R), disc(cx, cy, R - 0.8), z0, z1));

  // the floor plate everything stands on
  box(-6, -6, 146, 28, -3, 0, 8, 2);

  // the box's legs, back to front
  const legs = [];
  for (const x of [3, 38, 73]) for (const y of [1, 17]) legs.push([x, y]);
  legs.sort((a, b) => a[0] + a[1] - b[0] - b[1]).forEach(([x, y]) => box(x, y, x + 4, y + 4, 0, Z0, 1.2, 0.6));

  // the mould box, its stiffening ribs round the near side and the roof, and the opening in its end
  box(0, 0, XE, BW, Z0, Z1, 3, 1.6);
  let ribs = "";
  for (let x = 10; x < XE; x += 10) ribs += seg(P(x, BW, Z0 + 1), P(x, BW, Z1)) + seg(P(x, BW, Z1), P(x, 1.5, Z1));
  ribs += seg(P(2, BW, Z1 - 5), P(XE - 2, BW, Z1 - 5));
  lines(ribs);
  lines(poly([[XE, BY0 - 1, BZ0 - 1], [XE, BY1 + 1, BZ0 - 1], [XE, BY1 + 1, BZ1 + 1], [XE, BY0 - 1, BZ1 + 1]].map((p) => P(...p))));

  // feed guns along the roof, the bead header that serves them, and the steam manifold along the side
  for (const x of [14, 30, 46, 62]) { cyl(x, 9, 3, Z1, Z1 + 6); cyl(x, 9, 1.6, Z1 + 6, Z1 + 9); }
  box(8, 15, 70, 18, Z1, Z1 + 3, 1.5, 0.6);
  box(6, BW, 74, BW + 3, Z0 + 1, Z0 + 4, 1.5, 0.6);

  // the gantry's far post, then the roller table on its legs, its rollers dim
  box(80, -4, 84, -1, 0, 60, 1.2, 0.6);
  for (const [x, y] of [[88, 2], [88, 17], [131, 2], [131, 17]]) box(x, y, x + 3, y + 3, 0, TZ - 4, 1, 0.5);
  box(TX0, 1, TX1, 21, TZ - 4, TZ, 2, 1);
  let rollers = "";
  for (let x = TX0 + 3; x < TX1; x += 5) rollers += seg(P(x, 2.5, TZ), P(x, 19.5, TZ));
  lines(rollers);

  // what moves: the block, the door, and the door's rod
  const blk = solid(g), door = solid(g), dRibs = lines(""), rod = lines("", "nf");
  blk.sil.classList.add("hi");

  // the gantry's near post, its beam, and the lifting cylinder on top
  box(80, 23, 84, 26, 0, 60, 1.2, 0.6);
  box(80, -4, 84, 26, 60, 64, 1.5, 0.8);
  cyl(82, 11, 3.2, 64, 73);

  // one spring: t below 0 is the door lifting, t above 0 is the block out, in world units
  const sp = spring(0.2 * reach, { eps: 0.05 });
  let restT = 0.2 * reach, drawn = NaN;

  function draw() {
    const t = clamp(sp.x, -DS, reach);
    if (t === drawn) return;
    drawn = t;
    const h = LIFT * clamp((t + DS) / DS, 0, 1), out = Math.max(0, t);
    if (out > 3) {
      const [ring, inner] = rings(XE, BY0, XE + out, BY1, 1.5, 1);
      put(blk, prism(P, front, ring, inner, BZ0, BZ1));
    } else put(blk, { sil: "", crease: "" });
    put(door, prism(P, front, ...rings(XE, 1, XE + 3, BW - 1, 1.2, 0.6), Z0 + h, Z1 + h));
    dRibs.setAttribute("d", [8, 16].map((dz) => seg(P(XE + 3, 2, Z0 + h + dz), P(XE + 3, BW - 2, Z0 + h + dz))).join(""));
    rod.setAttribute("d", seg(P(XE + 1.5, 11, Z1 + h), P(XE + 1.5, 11, 60)));
    door.sil.classList.toggle("hi", out <= 3);
  }

  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  function caption(t) {
    if (t <= -DS + 0.5) return "shut";
    if (t < 0.5) return `door ${Math.round(((t + DS) / DS) * 100)}%`;
    return `out ${(t / U).toFixed(1)} m`;
  }
  let over = false;
  function aim(t) { sp.t = t; read.textContent = over ? caption(t) : "rest"; B.wake(); }

  // read on a plane that never moves, half way up the box: where along the machine the pointer is
  bag.add(pointer(stage, {
    move: (p) => { over = true; aim(clamp(unproj(C, p[0], p[1], HZ)[0] - XE, -DS, reach)); },
    leave: () => { over = false; aim(restT); },
  }));
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";

  return {
    set: (v) => {
      reach = v * U; restT = 0.2 * reach;
      sp.t = over ? clamp(sp.t, -DS, reach) : restT;
      drawn = NaN; B.wake();
    },
    destroy: bag.dispose,
  };
}

hairline({
  name: "eps-mould",
  means: "An EPS block moulding machine: the pointer lifts its door and draws the white block out onto the roller table.",
  rules: [1, 3, 5, 8, 9],
  range: [1.5, 3, 4.5],
  tour: [[170, 144], [195, 155], [299, 205], null],
  mount,
});
