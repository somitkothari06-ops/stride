export const landingStarter=`const players = [
  { name: "Riya", team: "Falcons" },
  { name: "Dev", team: null },
  { name: "Sam", team: "Tigers" }
];
const free = players.filter(p => !p.team);
console.log(free);`;
export function landingPlayerRows(lines:string[]):{name:string;team:string|null}[]|null{
 for(const line of lines){try{const value:unknown=JSON.parse(line);if(Array.isArray(value)&&value.length<=20&&value.every(row=>row&&typeof row==='object'&&typeof row.name==='string'&&row.name.length<=80&&(row.team===null||typeof row.team==='string'&&row.team.length<=80)))return value.map(row=>({name:row.name,team:row.team}));}catch{}}
 return null;
}
