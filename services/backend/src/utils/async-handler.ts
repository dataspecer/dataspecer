import express from "express";
import { ZodError } from "zod";

export const asyncHandler = (fn: (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) => Promise<void>) => async (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction
) => {
  try {
    await fn(request, response, next);
  } catch (error) {
    console.error(error);
    if (response.headersSent) {
      return;
    }
    // Handlers validate their input with zod - a validation failure is the
    // client's fault.
    const status = error instanceof ZodError ? 400 : 500;
    response.status(status).send({error: String(error)});
  }
};
