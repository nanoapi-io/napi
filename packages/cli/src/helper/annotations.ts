import { NanoAPIAnnotation } from "./types";

export function getNanoApiAnnotationFromCommentValue(comment: string) {
  const nanoapiRegex = /@nanoapi|((method|path|group):([^ ]+))/g;
  const matches = comment.match(nanoapiRegex);
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

  return null;
}

export function replaceCommentFromAnnotation(
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
