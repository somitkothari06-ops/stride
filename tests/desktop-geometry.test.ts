import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampDesktopWindow} from '../lib/desktop-geometry';
test('dragging can cross the desk but keeps the window inside its usable area',()=>{
 const window={left:500,top:60,width:350,height:400},desk={width:1200,height:600};
 assert.deepEqual(clampDesktopWindow({x:-400,y:20},window,desk),{x:-400,y:20});
 assert.deepEqual(clampDesktopWindow({x:-900,y:-900},window,desk),{x:-500,y:-60});
 assert.deepEqual(clampDesktopWindow({x:900,y:900},window,desk),{x:350,y:140});
 assert.deepEqual(clampDesktopWindow({x:0,y:0},{left:0,top:0,width:1400,height:700},desk),{x:0,y:0});
});
