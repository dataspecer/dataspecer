import React, { useCallback, useEffect, useState } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from './components/ui/button';
import LabeledInput from './customComponents/LabeledInput';
import FormCardSection from './customComponents/FormCardSection';
import CustomCheckbox from './customComponents/CustomCheckbox';
import DataStructuresSelect from './customComponents/DataStructSelect';
import { generateOpenAPISpecification } from './OpenAPIGenerator';
import { useDataSpecificationInfo } from './DataStructureFetcher';
import OperationCard from './customComponents/OperationCard';
import { DataStructure, Field } from '@/Models/DataStructureNex';
import useSWR from 'swr';
import { zodResolver } from '@hookform/resolvers/zod'


type Operation = {
    name: string;
    isCollection: boolean;
    oAssociatonMode: boolean;
    oType: string;
    oName: string;
    oEndpoint: string;
    oComment: string;
    oResponse: string;
    oRequestBody: {
        [key: string]: string;
    };
    oResponseObject?: DataStructure
};

type FormValues = {
    apiTitle: string;
    apiDescription: string;
    apiVersion: string;
    baseUrl: string;
    //dataSpecification: string;
    dataStructures: {
        id?: string;
        name: string;
        operations: Operation[];
    }[];
};

const formSchema = z.object({
    apiTitle: z.string().min(1).regex(/^[a-zA-Z]+$/, { message: "Please enter a valid API Title." }),
    apiDescription: z.string().min(1), // non-empty string
    apiVersion: z.string().regex(/^\d+\.\d+$/, { message: "Please enter a valid API Version. \nExample: 1.0" }),
    baseUrl: z.string().regex(/^https:\/\/\w+\.\w+$/, { message: "BaseURL has to be in the following format: https://someUrl.com" }),
    dataStructures: z.array(
        z.object({
            id: z.string().optional(),
            name: z.string().min(1),
            operations: z.array(
                z.object({
                    name: z.string(),
                    isCollection: z.boolean(),
                    oAssociatonMode: z.boolean(),
                    oType: z.string(),
                    oName: z.string(),
                    oEndpoint: z.string(),
                    oComment: z.string(),
                    oResponse: z.string(),
                    oRequestBody: z.record(z.string()),
                    oResponseObject: z.object({

                    }).optional()
                })
            ),
        })
    ).optional(),
});


const fetchSavedConfig = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Failed to fetch configuration');
    }

    return response.json();
};

//export const ApiSpecificationForm = () => {
interface ApiSpecificationFormProps {
    setGeneratedOpenAPISpecification: (openAPISpec: any) => void;
}

export const ApiSpecificationForm: React.FC<ApiSpecificationFormProps> = ({ setGeneratedOpenAPISpecification }) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState } = useForm<FormValues>({
        resolver: zodResolver(formSchema)
    });

    const { errors } = formState;

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "dataStructures",
    });

    const baseUrl = watch("baseUrl");


    const handleBaseUrlChange = useCallback((newBaseUrl) => {
        console.log(`baseUrl changed to: ${newBaseUrl}`);
    }, []);

    useEffect(() => {
        console.log('Form errors:', errors);
    }, [errors]);

    useEffect(() => {
        handleBaseUrlChange(baseUrl);
    }, [baseUrl, handleBaseUrlChange]);


    const [selectedDataStructures, setSelectedDataStructures] = useState<Array<any>>([]);

    useEffect(() => {
        console.log("Selected Data Structures:", selectedDataStructures);
        if (selectedDataStructures === undefined) {
            console.log("Selected Data Structures became undefined!");
        }
    },);

    useEffect(() => {
        const dataStructures = watch("dataStructures");
        setSelectedDataStructures(dataStructures)
    }, [watch]);

    const [fetchedDataStructuresArr, setFetchedDataStructuresArr] = useState([]);

    const { fetchDataStructures } = useDataSpecificationInfo();

    /* START - GET Presaved configuration */
    const getModelIri = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('model-iri');
    };

    const modelIri = getModelIri();

    const { data: fetchedData, error: fetchError } = useSWR(`https://backend.dataspecer.com/resources/blob?iri=${encodeURIComponent(modelIri)}`, fetchSavedConfig);

    useEffect(() => {
        if (fetchedData) {
            console.log('Fetched Data:', fetchedData);
            setValue('apiTitle', fetchedData.apiTitle);
            setValue('apiDescription', fetchedData.apiDescription);
            setValue('apiVersion', fetchedData.apiVersion);
            setValue('baseUrl', fetchedData.baseUrl);
            //setValue('dataSpecification', fetchedData.dataSpecification);
            setValue('dataStructures', fetchedData.dataStructures);

            setSelectedDataStructures(fetchedData.dataStructures);
        } else {
            console.log("Fetched data is not yet available");
        }
    }, [fetchedData, setValue]);

    /* END - GET Presaved configuration */


    useEffect(() => {
        if (!fetchDataStructures) {
            console.error('fetchDataStructures is not defined or not callable');
            return;
        }

        const fetchData = async () => {
            try {
                const data = await fetchDataStructures();
                if (!data) {
                    console.log('No data structures found.');
                    return;
                }

                setFetchedDataStructuresArr(data);
            } catch (err) {
                console.error('Error fetching data structures:', err);
            }
        };

        fetchData();
    }, [fetchDataStructures]);

    console.log(fetchedDataStructuresArr);


    const onSubmit: SubmitHandler<FormValues> = async (data) => {


        await formSchema.parseAsync(data);

        const getModelIri = () => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('model-iri');
        };

        const modelIri = getModelIri();

        try {

            const openAPISpec = generateOpenAPISpecification(fetchedDataStructuresArr, data);
            setGeneratedOpenAPISpecification(openAPISpec);
            console.log(openAPISpec)

            const response = await fetch(`https://backend.dataspecer.com/resources/blob?iri=${encodeURIComponent(modelIri)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

            if (response.ok) {
                console.log('Form data saved successfully. Submitted data is: ' + JSON.stringify(data));
            } else {
                console.error('Failed to save form data.');
            }
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Form validation failed:', error.errors);
                error.errors.forEach(({ path, message }) => {
                    const field = path[0] as keyof FormValues;
                    formState.errors[field] = { message } as any; // Type assertion to satisfy TypeScript
                });
            } else {
                console.error('Form validation failed:', error.message);
            }
        }
    };

    const addOperation = (index: number) => {

        const defaultDataStructure: DataStructure = {
            id: '',
            name: '',
            givenName: '',
            fields: []
        };

        const newOperation = {
            name: '',
            isCollection: false,
            oAssociatonMode: false,
            oType: '',
            oName: '',
            oEndpoint: '',
            oComment: '',
            oResponse: '',
            oRequestBody: {},
            oResponseObject: defaultDataStructure
        };


        update(index, {
            ...fields[index],
            operations: [...fields[index].operations, newOperation],
        });

        setSelectedDataStructures((prevState) => {
            const newState = [...prevState];
            if (!newState[index]) {
                newState[index] = { operations: [] };
            }
            newState[index] = { ...newState[index], operations: newOperation };
            return newState;
        });

        console.log(...fields[index].operations)
    };

    // Function to remove an operation from a data structure
    const removeOperation = (dataStructureIndex: number, operationIndex: number) => {
        const updatedOperations = fields[dataStructureIndex].operations.filter((_, idx) => idx !== operationIndex);

        update(dataStructureIndex, {
            ...fields[dataStructureIndex],
            operations: updatedOperations,
        });

        setSelectedDataStructures((prevState) => {
            const newState = [...prevState];
            newState[dataStructureIndex].operations = updatedOperations;
            return newState;
        });
    };

    return (
        <form className="flex flex-col gap-4 p-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Form Info */}
            <FormCardSection>
                <LabeledInput label="API Title" id="apiTitle" register={register} required />
                {errors.apiTitle && <p className='text-red-500 text-sm'>{errors.apiTitle?.message}</p>}
                <LabeledInput label="API Description" id="apiDescription" register={register} required />
                {errors.apiDescription && <p className='text-red-500 text-sm'>{errors.apiDescription?.message}</p>}
                <LabeledInput label="API Version" id="apiVersion" register={register} required />
                {errors.apiVersion && <p className='text-red-500 text-sm'>{errors.apiVersion?.message}</p>}
                <LabeledInput label="Base URL" id="baseUrl" register={register} required />
                {errors.baseUrl && <p className='text-red-500 text-sm'>{errors.baseUrl?.message}</p>}
                {/* <LabeledInput label="Data Specification" id="dataSpecification" register={register} required /> */}
            </FormCardSection>

            {/* Data Structures */}
            <FormCardSection>
                <h3>Data Structures:</h3>
                {fields.map((field, index) => (
                    <FormCardSection key={field.id}>
                        <div className="flex flex-row justify-between">
                            <div>
                                <label>Choose Data Structure:</label>
                                <DataStructuresSelect
                                    key={`dataStructureSelect_${index}`}
                                    index={index}
                                    register={register}
                                    dataStructures={fetchedDataStructuresArr}
                                    defaultValue={fetchedData?.dataStructures?.[index]?.name ?? ""}
                                    //defaultValue={fetchedData ? fetchedData.dataStructures?.[index]?.name ?? "" : ""}
                                    isResponseObj={false}
                                    onChange={(selectedDataStructure) => {

                                        const defaultValue = fetchedData?.dataStructures?.[index]?.name ?? "";
                                        const nameToUse = selectedDataStructure?.name ?? defaultValue;

                                        console.log("Selected ds is: " + JSON.stringify(selectedDataStructure));
                                        register(`dataStructures.${index}.name`).onChange({
                                            target: {
                                                //value: selectedDataStructure.name,
                                                value: nameToUse
                                            },

                                        });

                                        setSelectedDataStructures((prevState) => {
                                            //const newState = [...prevState];
                                            const newState = Array.isArray(prevState) ? [...prevState] : [];
                                            newState[index] = selectedDataStructure;
                                            return newState;
                                        });

                                        update(index, {
                                            ...fields[index],
                                            //name: selectedDataStructure.givenName,
                                            name: selectedDataStructure?.givenName ?? defaultValue,
                                            //id: selectedDataStructure.id,
                                        });
                                    }} operationIndex={undefined}
                                />
                            </div>
                            <Button className="bg-red-500 hover:bg-red-400" type="button" onClick={() => remove(index)}>
                                Delete
                            </Button>
                        </div>

                        {/* Operations */}
                        <FormCardSection>
                            <h4>Operations:</h4>
                            {field.operations.map((op, opIndex) => (
                                <OperationCard
                                    key={opIndex}
                                    operationIndex={opIndex}
                                    removeOperation={removeOperation}
                                    index={index}
                                    register={register}
                                    setValue={setValue}
                                    getValues={getValues}
                                    collectionLogicEnabled={false}
                                    singleResourceLogicEnabled={false}
                                    baseUrl={baseUrl}
                                    selectedDataStructure={selectedDataStructures[index]?.givenName || selectedDataStructures[index]?.name}
                                    fetchedDataStructures={fetchedDataStructuresArr}
                                    selectedDataStruct={selectedDataStructures} />
                            ))}

                            {/* Add operation button */}
                            <Button
                                className="bg-blue-500 hover:bg-blue-400"
                                type="button"
                                onClick={() => addOperation(index)}
                            >
                                Add Operation
                            </Button>
                        </FormCardSection>
                    </FormCardSection>
                ))}
                <Button
                    className="bg-blue-500 hover:bg-blue-400"
                    type="button"
                    onClick={() => append({ name: '', operations: [] })}
                >
                    Add Data Structure
                </Button>
            </FormCardSection>

            {/* Submit Button */}
            <Button type="submit">Generate OpenAPI Specification</Button>
        </form>
    );
};
