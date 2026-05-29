import { addSeconds, format, startOfDay } from "date-fns";

export const formatSeconds = (seconds: number) => {
  const date = addSeconds(startOfDay(new Date()), seconds);
  return format(date, "HH:mm:ss");
};