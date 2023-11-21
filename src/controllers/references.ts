import { NextFunction, Request, Response } from "express";
import { DefinedReference } from "../models/DefinedReference/DefinedReference.model";
import { mapLanguageValueArray } from "../utils/parseLanguageValue";
import fs from "fs";
import path from "path";

/**
 * Retrieves all reference models
 */
export const getAllReferences = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await DefinedReference.find();
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all references of a specific type
 */
export const getReferencesByType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.params;
    const data = await DefinedReference.find({ type });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

type LanguageContainerField = { "@language": string; "@value": string }[];
type ReferenceCreationPayload = {
  /**
   * Title / Name of the reference
   */
  title?: string;

  /**
   * Descriptions (multiple language support)
   * Used only for roles
   */
  descriptions?: LanguageContainerField;

  /**
   * Reference Definition (multiple language support)
   * Used on all but roles
   */
  definitions?: LanguageContainerField;

  /**
   * Definitions for a role
   * Used only for roles
   */
  roleDefinitions?: string[];

  /**
   * Responsibilities and obligations of a role
   * Used only for roles
   */
  responsibilitiesAndObligations?: string[];
};

/**
 * Creates a user defined reference model and creates the matching
 * JSON-LD model for it to match PTX reference models
 */
export const createUserDefinedReference = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.params;
    const {
      title,
      descriptions,
      definitions,
      roleDefinitions,
      responsibilitiesAndObligations,
    }: ReferenceCreationPayload = req.body;

    let jsonldData: any;

    const refURL = `${
      process.env.API_URL?.slice(0, -3) || "http://localhost:3000"
    }/static/${type}/${title}.json`;

    const newRef = new DefinedReference({
      type,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      refURL: refURL ?? null,
    });

    // Create JSON-LD for the new reference
    if (type === "roles") {
      jsonldData = {
        "@context": {
          description: {
            "@id": "https://schema.org/description",
            "@container": "@language",
          },
        },
        title: title,
        description: mapLanguageValueArray(descriptions) || [],
        definitions: roleDefinitions || [],
        responsibilitiesAndObligations: responsibilitiesAndObligations || [],
      };
    } else {
      jsonldData = {
        "@context": {
          definition: {
            "@id": "https://schema.org/DefinedTerm",
            "@container": "@language",
          },
        },
        title,
        "@id": refURL,
        definition: mapLanguageValueArray(definitions) || [],
      };
    }

    newRef.jsonld = JSON.stringify(jsonldData);

    await Promise.all([
      newRef.save(),
      fs.promises
        .mkdir(path.join(__dirname, `../../static/${type}`), {
          recursive: true,
        })
        .then((x) =>
          fs.promises.writeFile(
            path.join(
              __dirname,
              `../../static/${type}/${jsonldData.title.toString()}.json`
            ),
            JSON.stringify(jsonldData, null, 2)
          )
        ),
    ]);

    return res.status(201).json(newRef);
  } catch (err) {
    next(err);
  }
};
