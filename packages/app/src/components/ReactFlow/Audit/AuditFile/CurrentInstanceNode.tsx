import { DataList, Tooltip } from "@radix-ui/themes";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { defaultMaxPathLength, getDisplayedPath } from "../../../../helpers";
import InstanceTypeBadge from "../../../Badges/InstanceTypeBadge";
import { AuditResult } from "../../../../service/api/types";
import { useEffect, useState } from "react";

export default function CurrentInstanceNode(
  props: NodeProps<
    Node<
      {
        fileName: string;
        instanceName: string;
        instanceType: string;
        auditResult: AuditResult[];
      } & Record<string, unknown>
    >
  >,
) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const warnings: string[] = [];
    const errors: string[] = [];

    props.data.auditResult.forEach((result) => {
      if (result.result === "warning") {
        warnings.push(result.message.short);
      }
      if (result.result === "error") {
        errors.push(result.message.short);
      }
    });

    setWarnings(warnings);
    setErrors(errors);
  }, [props.data.auditResult]);

  const className = [
    "bg-secondarySurface-light dark:bg-secondarySurface-dark",
    "rounded-xl border border-border-light dark:border-border-dark",
  ].join(" ");

  return (
    <div
      className={className}
      style={{
        width: props.width,
        height: props.height,
        zIndex: props.zIndex,
      }}
    >
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />

      <div className="py-2 px-3">
        <DataList.Root size="1">
          {props.data.isExternal ? (
            <DataList.Item>
              <DataList.Label>
                <div className="text-text-light dark:text-text-dark">
                  External Reference
                </div>
              </DataList.Label>
              <DataList.Value>
                {props.data.fileName.length > defaultMaxPathLength ? (
                  <Tooltip content={props.data.fileName}>
                    <div className="font-bold">
                      {getDisplayedPath(
                        props.data.fileName,
                        defaultMaxPathLength,
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  <div className="font-bold">{props.data.fileName}</div>
                )}
              </DataList.Value>
            </DataList.Item>
          ) : (
            <DataList.Item>
              <DataList.Label>
                <div className="text-text-light dark:text-text-dark">
                  File Name
                </div>
              </DataList.Label>
              <DataList.Value>
                {props.data.fileName.length > defaultMaxPathLength ? (
                  <Tooltip content={props.data.fileName}>
                    <div className="font-bold">
                      {getDisplayedPath(
                        props.data.fileName,
                        defaultMaxPathLength,
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  <div className="font-bold">props.data.fileName</div>
                )}
              </DataList.Value>
            </DataList.Item>
          )}

          <DataList.Item>
            <DataList.Label>
              <div className="text-text-light dark:text-text-dark">
                Instance Name
              </div>
            </DataList.Label>
            <DataList.Value>
              <div className="font-bold">{props.data.instanceName}</div>
            </DataList.Value>
          </DataList.Item>
          {props.data.instanceType && (
            <DataList.Item>
              <DataList.Label>
                <div className="text-text-light dark:text-text-dark">Type</div>
              </DataList.Label>
              <DataList.Value>
                <div className="font-bold">
                  <InstanceTypeBadge type={props.data.instanceType} />
                </div>
              </DataList.Value>
            </DataList.Item>
          )}
          <DataList.Item>
            <DataList.Label>
              <div className="text-text-light dark:text-text-dark">
                Audit Results
              </div>
            </DataList.Label>
            <DataList.Value>
              <div className="font-bold">
                {warnings.length === 0 && errors.length === 0 && (
                  <div className="text-success">No issues found</div>
                )}
                {warnings.length > 0 && (
                  <Tooltip
                    content={
                      <ul className="text-md">
                        {warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    }
                  >
                    <div className="text-warning">
                      {warnings.length} Warnings found
                    </div>
                  </Tooltip>
                )}
                {errors.length > 0 && (
                  <Tooltip
                    content={
                      <ul className="text-md">
                        {errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    }
                  >
                    <div className="text-error">
                      {errors.length} Errors found
                    </div>
                  </Tooltip>
                )}
              </div>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </div>

      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
    </div>
  );
}
