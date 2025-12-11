import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { ErrorMessage } from "../../Label/ErrorMessage";
import { StyledLabel } from "../../Label/StyledLabel";
import { StyledInput } from "./StyledInput";

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number";
  register: UseFormRegisterReturn;
  error?: FieldError;
  className?: string;
  min?: number;
  max?: number;
}

/**
 *
 * @param props
 * @param props.label
 * @param props.type
 * @param props.register
 * @param props.error
 * @param props.placeholder
 * @param props.className
 */
export default function Input(props: InputProps) {
  return (
    <div className={props.className}>
      <StyledLabel>
        {props.label}
        <div className="mt-1">
          <StyledInput
            autoComplete={"off"}
            type={props.type}
            min={props.type === "number" ? props.min : undefined}
            max={props.type === "number" ? props.max : undefined}
            placeholder={props.placeholder}
            {...props.register}
          />
        </div>
      </StyledLabel>
      <ErrorMessage error={props.error} />
    </div>
  );
}
