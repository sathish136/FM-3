// step-parser-worker.js
// OCCT is initialised ONCE when the worker starts, then reused for all parse requests.
// This avoids the expensive WASM init on every file open.

var occtInstance = null;
var initResolvers = [];
var initState = 'idle'; // 'idle' | 'loading' | 'ready' | 'failed'
var initError = null;

function getBase() {
  var loc = self.location.href;
  return loc.substring(0, loc.lastIndexOf('/') + 1);
}

function startInit() {
  if (initState !== 'idle') return;
  initState = 'loading';
  var base = getBase();
  importScripts(base + 'occt-import-js.js');
  occtimportjs({
    locateFile: function(path) {
      if (path.endsWith('.wasm')) return base + 'occt-import-js.wasm';
      return base + path;
    }
  }).then(function(instance) {
    occtInstance = instance;
    initState = 'ready';
    var resolvers = initResolvers.slice();
    initResolvers = [];
    resolvers.forEach(function(r) { r.resolve(); });
  }).catch(function(err) {
    initState = 'failed';
    initError = err && err.message ? err.message : String(err);
    var resolvers = initResolvers.slice();
    initResolvers = [];
    resolvers.forEach(function(r) { r.reject(new Error(initError)); });
  });
}

function waitForOcct() {
  return new Promise(function(resolve, reject) {
    if (initState === 'ready') { resolve(); return; }
    if (initState === 'failed') { reject(new Error(initError)); return; }
    initResolvers.push({ resolve: resolve, reject: reject });
    if (initState === 'idle') startInit();
  });
}

// Kick off init immediately so it's ready by the time a file arrives
startInit();

function buildTree(node, parentId, counter) {
  var id = parentId + '-' + (counter.n++);
  return {
    id: id,
    name: node.name || 'Unnamed',
    meshIndices: Array.isArray(node.meshes) ? node.meshes : [],
    children: Array.isArray(node.children)
      ? node.children.map(function(c) { return buildTree(c, id, counter); })
      : []
  };
}

onmessage = async function(ev) {
  var id = ev.data.id;
  var buffer = ev.data.buffer;

  function progress(msg) {
    postMessage({ type: 'progress', id: id, msg: msg });
  }

  try {
    progress('Loading OpenCascade engine…');
    await waitForOcct();

    progress('Parsing STEP file…');
    var fileData = new Uint8Array(buffer);
    var result = occtInstance.ReadStepFile(fileData, null);

    if (!result || !result.success) {
      postMessage({ type: 'error', id: id, error: 'Failed to parse STEP file — file may be corrupt or unsupported.' });
      return;
    }

    var total = result.meshes.length;
    progress('Extracting ' + total + ' part(s)…');

    var meshes = [];
    for (var i = 0; i < total; i++) {
      var mesh = result.meshes[i];

      var positions = Array.from(mesh.attributes.position.array);
      var normals = mesh.attributes.normal ? Array.from(mesh.attributes.normal.array) : [];
      var indices = Array.from(mesh.index.array);

      var color = null;
      if (mesh.color) color = [mesh.color[0], mesh.color[1], mesh.color[2]];

      var brepFaces = [];
      if (Array.isArray(mesh.brep_faces)) {
        for (var j = 0; j < mesh.brep_faces.length; j++) {
          var face = mesh.brep_faces[j];
          brepFaces.push({
            first: face.first,
            last: face.last,
            color: face.color ? [face.color[0], face.color[1], face.color[2]] : null
          });
        }
      }

      meshes.push({
        positions: positions,
        normals: normals,
        indices: indices,
        color: color,
        brepFaces: brepFaces,
        name: mesh.name || ('Part ' + (i + 1))
      });

      if (i % 20 === 0 && i > 0) {
        progress('Processed ' + (i + 1) + ' of ' + total + ' parts…');
        // yield to let progress messages flush
        await new Promise(function(r) { setTimeout(r, 0); });
      }
    }

    var root;
    if (result.root) {
      root = buildTree(result.root, 'root', { n: 0 });
      if (!root.name || root.name === '' || root.name === 'Unnamed') root.name = 'Assembly';
    } else {
      root = {
        id: 'root',
        name: 'Assembly',
        meshIndices: meshes.map(function(_, k) { return k; }),
        children: []
      };
    }

    postMessage({ type: 'done', id: id, meshes: meshes, root: root });
  } catch (e) {
    postMessage({ type: 'error', id: id, error: e && e.message ? e.message : 'Parse failed' });
  }
};
