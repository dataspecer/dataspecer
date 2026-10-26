import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from './components/ui/button';
import LabeledInput from './customComponents/LabeledInput';
import FormSection from './customComponents/FormSection';
import DataStructuresSelect from './customComponents/DataStructSelect';
import { generateOpenAPISpecification } from './OApiGenerator';
import { retrieveDataSpecificationInfo } from './DataStructureFetcher';
import OperationCard from './customComponents/OperationCard';
import { DataStructure, Field } from '@/Models/DataStructureModel';
import useSWR from 'swr';
import { zodResolver } from '@hookform/resolvers/zod'
import { FormValues } from './Models/FormValuesModel';
import { formValidationchema } from './FormValidationSchema';
import OpenAPIDisplay from './customComponents/OpenAPIDisplay';

const backendUrl = import.meta.env.VITE_BACKEND;

/* Fetcher for fetching presaved data (configuration provided by the user) */
const fetchSavedConfig = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Failed to fetch pre-saved configuration');
    }

    return response.json();
};

export const MainForm = () => {

    const { register, handleSubmit, control, watch, setValue, getValues, formState } = useForm<FormValues>({
        resolver: zodResolver(formValidationchema)
    });

    const { errors } = formState;

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "dataStructures",
    });

    const [selectedDataStructures, setSelectedDataStructures] = useState<Array<any>>([]);
    const [fetchingData, setFetchingData] = useState(false);
    const [availableDataStructs, setAvailableDataStructs] = useState([]);


    /* watch changes in dataStructures and update selectedDataStructures accordingly */
    useEffect(() => {
        const dataStructures = watch("dataStructures");
        setSelectedDataStructures(dataStructures)
        setAvailableDataStructs(availableDataStructs)
    }, [watch]);


    const [fetchedDataStructuresArr, setFetchedDataStructuresArr] = useState([]);

    useEffect(() => {
        if (!selectedDataStructures || !fetchedDataStructuresArr || !fields) {
            return;
        }

        const selectedDataStructs = selectedDataStructures.map(ds => ds.name);
        const availableDataStructs = fetchedDataStructuresArr.filter(ds => !selectedDataStructs.includes(ds.name) && !selectedDataStructs.includes(ds.givenName));

        setAvailableDataStructs(availableDataStructs);
    }, [selectedDataStructures, fetchedDataStructuresArr, fields]);

    /* Data specification info - its data structures*/
    const { fetchDataStructures } = retrieveDataSpecificationInfo();

    /* gets id of the model (modelIri) from current URL */
    const getModelIri = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('model-iri');
    };

    const modelIri = getModelIri();

    /* retrieve pre-saved configuration and store in preSavedData */
    const { data: preSavedData, error: fetchError } = useSWR(`${backendUrl}/resources/blob?iri=${encodeURIComponent(modelIri)}`, fetchSavedConfig);

    /* fetch data structures of current data specification information */
    useEffect(() => {
        if (!fetchDataStructures) {
            console.error('Could not fetch: fetchDataStructures is undefined');
            return;
        }

        const fetchData = async () => {
            try {
                const data = await fetchDataStructures();
                if (!data) {
                    console.log('Data structures could not be found');
                    return;
                }

                setFetchedDataStructuresArr(data);
                setAvailableDataStructs(data);
            } catch (err) {
                console.error('Data structures could not be fetched. Error: ', err);
            }
        };

        fetchData();
    }, [fetchDataStructures]);

    /* Set values according to the pre-saved data */
    useEffect(() => {
        if (preSavedData) {
            setValue('apiTitle', preSavedData.apiTitle);
            setValue('apiDescription', preSavedData.apiDescription);
            setValue('apiVersion', preSavedData.apiVersion);
            setValue('baseUrl', preSavedData.baseUrl);
            setValue('dataStructures', preSavedData.dataStructures);
            setSelectedDataStructures(preSavedData.dataStructures);
            setFetchingData(false);
        }
    }, [preSavedData, setValue]);


    const [openAPISpec, setOpenAPISpec] = useState<any>({});


    /* handles form submission
     * resulting OAS is generated and user-provided configuration is saved on the Dataspecer backend
     */
    const onSubmit: SubmitHandler<FormValues> = async (data, event) => {
        event.preventDefault();

        const newData = getValues();

        const modelIri = getModelIri();

        try {

            /* generate OpenApi specification */
            const newOpenAPISpec = generateOpenAPISpecification(fetchedDataStructuresArr, newData);
            setOpenAPISpec(newOpenAPISpec);

            /* save configuration provided by the user on the backend */
            const response = await fetch(`${backendUrl}/resources/blob?iri=${encodeURIComponent(modelIri)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newData),
                });

            if (response.ok) {
                //console.log('Form data saved successfully. Submitted data is: ' + JSON.stringify(newData));
            } else {
                console.error('Failed to save form data.');
            }
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Validation of the form failed because: ', error.issues);
                error.issues.forEach(({ path, message }) => {
                    const field = path[0] as keyof FormValues;
                    formState.errors[field] = { message } as any;
                });
            } else {
                console.error('Validation of the form failed because:', error.message);
            }
        }


    };


    /* adds new operation */
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

    };

    /* removes operation */
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
        <div className="flex flex-row gap-8">
            <div className="flex flex-col gap-4 w-1/2">
                {/* first column */}
                <form className="flex flex-col gap-4 p-4" onSubmit={(e) => {
                    handleSubmit(onSubmit)(e);
                }}>
                    {/* Form Info - metadata */}
                    <FormSection>
                        <LabeledInput label="API Title" id="apiTitle" register={register} required placeholder='Please provide API title with no spaces' />
                        {errors.apiTitle && <p className='text-red-500 text-sm'>{errors.apiTitle?.message}</p>}
                        <LabeledInput label="API Description" id="apiDescription" register={register} required placeholder='Please write API description here' />
                        {errors.apiDescription && <p className='text-red-500 text-sm'>{errors.apiDescription?.message}</p>}
                        <LabeledInput label="API Version" id="apiVersion" register={register} required placeholder='Please write your API version here. Example: 1.0' />
                        {errors.apiVersion && <p className='text-red-500 text-sm'>{errors.apiVersion?.message}</p>}
                        <LabeledInput label="Base URL" id="baseUrl" register={register} required placeholder='Please write your base URL here. Example: https://test.com' />
                        {errors.baseUrl && <p className='text-red-500 text-sm'>{errors.baseUrl?.message}</p>}
                    </FormSection>

                    {/* Data Structures */}
                    <FormSection>
                        <h3>Data Structures:</h3>
                        {fields.map((field, index) => (
                            <FormSection key={field.id}>
                                <div className="flex flex-row justify-between">
                                    <div>
                                        <label>Choose Data Structure:</label>
                                        <DataStructuresSelect
                                            key={`dataStructureSelect_${index}`}
                                            index={index}
                                            register={register}
                                            dataStructures={fetchedDataStructuresArr}

                                            onChange={(selectedDataStructure) => {

                                                try {
                                                    const isDuplicate = selectedDataStructures.some(ds => ds.name === selectedDataStructure.name || ds.name === selectedDataStructure.givenName);

                                                    if (isDuplicate) {
                                                        alert('This data structure is already selected. Please select ANOTHER data structure');
                                                        return;
                                                    }
                                                }
                                                catch
                                                { }

                                                register(`dataStructures.${index}.name`).onChange({
                                                    target: {
                                                        value: selectedDataStructure.name,
                                                    },
                                                });

                                                setSelectedDataStructures((prevState) => {
                                                    const newState = Array.isArray(prevState) ? [...prevState] : [];
                                                    newState[index] = selectedDataStructure;
                                                    return newState;
                                                });

                                                update(index, {
                                                    ...fields[index],
                                                    name: selectedDataStructure.givenName,
                                                });
                                            }} getValues={getValues} />
                                    </div>
                                    <Button
                                        className="bg-red-500 hover:bg-red-400"
                                        type="button"
                                        onClick={() => {
                                            try {
                                                remove(index);
                                                setSelectedDataStructures((prevState) => {
                                                    try {
                                                        const newState = [...prevState];
                                                        newState.splice(index, 1);
                                                        return newState;
                                                    }
                                                    catch { }
                                                });
                                            }
                                            catch { }

                                        }}>
                                        Delete
                                    </Button>
                                </div>

                                {/* Operations */}
                                <FormSection>
                                    <h4>Operations:</h4>
                                    {!fetchingData && field.operations.map((op, opIndex) => (
                                        <OperationCard
                                            defaultValue={preSavedData?.dataStructures?.[index]?.operations?.[opIndex]?.oResponseObject?.givenName || ''}
                                            key={opIndex}
                                            operationIndex={opIndex}
                                            removeOperation={removeOperation}
                                            index={index}
                                            register={register}
                                            setValue={setValue}
                                            getValues={getValues}
                                            selectedDataStructure={selectedDataStructures[index]?.givenName || selectedDataStructures[index]?.name}
                                            fetchedDataStructures={fetchedDataStructuresArr}
                                            selectedDataStruct={selectedDataStructures} />
                                    ))}

                                    {/* Add operation button */}
                                    <Button
                                        className="zbg-blue-500 hover:bg-blue-400"
                                        type="button"
                                        onClick={() => addOperation(index)}
                                    >
                                        Add Operation
                                    </Button>

                                </FormSection>

                                {/* Validation errors*/}
                                {errors.dataStructures && errors.dataStructures[index]?.operations?.root?.message && (
                                    <p className="text-red-500 text-sm">{errors.dataStructures[index].operations.root.message}</p>
                                )}

                            </FormSection>
                        ))}
                        <Button
                            className="bg-blue-500 hover:bg-blue-400"
                            type="button"
                            onClick={() => append({ name: '', operations: [] })}
                            disabled={availableDataStructs.length === 0}
                        >
                            Add Data Structure
                        </Button>

                    </FormSection>

                    {/* Submit Button */}
                    <Button type="submit">Generate OpenAPI Specification</Button>
                </form>
            </div>

            {/* Second Column */}
            <div className="flex flex-col gap-4 w-1/2">
                <div className="flex - grow">
                    <OpenAPIDisplay generatedOpenAPISpecification={openAPISpec} />
                </div>

            </div>
        </div>
    );
};
