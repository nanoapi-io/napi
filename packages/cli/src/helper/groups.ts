import { Endpoint, Group } from "./types";

export function getGroupsFromEndpoints(endpoints: Endpoint[]) {
  const groups: Group[] = [];

  for (const endpoint of endpoints) {
    const group = groups.find((group) => group.name === endpoint.group);
    if (group) {
      group.endpoints.push(endpoint);
    } else {
      groups.push({
        name: endpoint.group || "",
        endpoints: [endpoint],
      });
    }
  }

  return groups;
}
