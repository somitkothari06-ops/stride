export const pocketMinutes=[15,30,60] as const;
export type PocketMinutes=typeof pocketMinutes[number];
export function pocketSchedule(minutes:PocketMinutes){
 const edge=minutes===15?3:minutes===30?5:10;
 return [{label:"Get your bearings",minutes:edge,note:"Pick one part and open what you need."},{label:"Get into it",minutes:minutes-edge*2,note:"Try an example or work through the tricky part."},{label:"Keep the useful bit",minutes:edge,note:"Explain what clicked and leave your next step."}];
}
export function pocketDescription(minutes:PocketMinutes){return pocketSchedule(minutes).map(step=>`${step.minutes} min: ${step.note}`).join(" ");}
