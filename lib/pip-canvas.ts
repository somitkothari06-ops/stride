export type PipPin={id:string;messageId:string;kind:'message'|'code';text:string};
export const MAX_PINS=6;
export function addCanvasPin(pins:PipPin[],pin:PipPin):{pins:PipPin[];status:'added'|'duplicate'|'full'}{
 if(pins.some(item=>item.messageId===pin.messageId&&item.kind===pin.kind&&item.text===pin.text))return{pins,status:'duplicate'};
 if(pins.length>=MAX_PINS)return{pins,status:'full'};
 return{pins:[...pins,pin],status:'added'};
}
