import { Link } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../../shadcn/Breadcrumb.tsx";

export default function BreadcrumbNav(props: {
  toProjectLink: () => string;
  fileId: string | null;
  toFileIdLink: (fileId: string) => string;
  instanceId: string | null;
  toInstanceIdLink: (fileId: string, instanceId: string) => string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={props.toProjectLink()}>Project</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {props.fileId && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={props.toFileIdLink(props.fileId)}>
                  {props.fileId}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {props.instanceId && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to={props.toInstanceIdLink(
                        props.fileId,
                        props.instanceId,
                      )}
                    >
                      {props.instanceId}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
