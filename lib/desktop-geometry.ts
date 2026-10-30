export type DesktopPoint={x:number;y:number};
export function clampDesktopWindow(point:DesktopPoint,window:{left:number;top:number;width:number;height:number},desk:{width:number;height:number}):DesktopPoint{
 // Keep the whole window visible when it fits; oversized windows retain their title.
 const visibleWidth=Math.min(window.width,desk.width),visibleHeight=Math.min(window.height,desk.height);
 return {x:Math.max(-window.left,Math.min(desk.width-window.left-visibleWidth,point.x)),y:Math.max(-window.top,Math.min(desk.height-window.top-visibleHeight,point.y))};
}
