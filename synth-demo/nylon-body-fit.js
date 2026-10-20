'use strict';
// Shared observation profile fitted to multiple notes, not note-specific EQ.
// Recording includes microphone/room effects; these are not measured physical body parameters.
// A4 refinement: modest shared radiation gain changes; mechanics and phases retained.
const NylonBodyFit = {
 "pluckScale": 0.7,
 "radiativeFractions": [
  0.005020320077307681,
  0.0012110022351293867,
  0.03902567386288779,
  0.03256753811609177,
  0.016848726213644912,
  0.030926063266087843,
  0.06494194183290584,
  0.007835369786949908,
  0.009266195152877228,
  0.015912474709354668,
  0.00038023545679054363,
  0.02612520528507395,
  0.10183595080119764,
  0.7538200670470018
 ],
 "radiationPhases": [
  -0.00126472,
  0.01166354,
  -0.6,
  0.26131173,
  0.01353157,
  0.6,
  -0.24285992,
  0.17877705,
  0.05711083,
  -0.10031131,
  -0.23877698,
  -0.35268994,
  -0.04317298,
  0.46337326
 ]
};

// 2026-10-20: shared output balance guided by six isolated guitar notes.
// Previous profile above remains available for A/B. No recorded audio is used.
// Mechanics, modal phases and pluck-position mapping are retained.
const NylonReferenceFit = {
 "pluckScale": 0.7,
 "radiativeFractions": [
  0.0008905975357020864,
  0.0007716526363529485,
  0.22802606339851972,
  0.008176945908348167,
  0.00212112895867201,
  0.003893360693243211,
  0.008175706086470384,
  0.0021542366416897477,
  0.014257481799676251,
  0.011429448609014027,
  0.00029659964548783173,
  0.007375713421560796,
  0.043651472422771356,
  1
 ],
 "radiationPhases": [
  -0.00126472,
  0.01166354,
  -0.6,
  0.26131173,
  0.01353157,
  0.6,
  -0.24285992,
  0.17877705,
  0.05711083,
  -0.10031131,
  -0.23877698,
  -0.35268994,
  -0.04317298,
  0.46337326
 ]
};
