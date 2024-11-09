import { Group, NanoAPIAnnotation } from "./types";

export function parseNanoApiAnnotation(value: string) {
  const nanoapiRegex = /@nanoapi|((method|path|group):([^ ]+))/g;
  const matches = value.match(nanoapiRegex);
  // remove first match, which is the @nanoapi identifier
  matches?.shift();

  if (matches && matches.length > 0) {
    return matches.reduce((acc, match) => {
      // key, first element when split with ":"
      const key = match.split(":")[0];
      // value, everything else
      const value = match.split(":").slice(1).join(":");
      return { ...acc, [key]: value };
    }, {} as NanoAPIAnnotation);
  }

  throw new Error("Could not parse annotation");
}

export function isAnnotationInGroup(
  group: Group,
  annotation: NanoAPIAnnotation,
) {
  // check if annotation has a method (actual endpoint)
  if (annotation.method) {
    const endpoint = group.endpoints.find(
      (endpoint) =>
        endpoint.method === annotation.method &&
        endpoint.path === annotation.path,
    );

    if (endpoint) {
      return true;
    }

    return false;
  }

  // if annotation has no method, we treat it as a module that contains other endpoints
  const endpoints = group.endpoints.filter((endpoint) =>
    endpoint.path.startsWith(annotation.path),
  );

  if (endpoints.length > 0) {
    return true;
  }

  return false;
}

export function updateCommentFromAnnotation(
  comment: string,
  annotation: NanoAPIAnnotation,
) {
  const commentRegex = /@nanoapi\s*(.*)/g;

  // Construct the new annotation string
  let newAnnotation = "@nanoapi";
  if (annotation.method) {
    newAnnotation += ` method:${annotation.method}`;
  }
  if (annotation.path) {
    newAnnotation += ` path:${annotation.path}`;
  }
  if (annotation.group) {
    newAnnotation += ` group:${annotation.group}`;
  }

  // Replace the old annotation with the new annotation
  const updatedComment = comment.replace(commentRegex, newAnnotation);

  return updatedComment;
}
