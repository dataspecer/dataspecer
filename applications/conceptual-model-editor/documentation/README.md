# Conceptual-Model-Editor : Documentation

This is a developer documentation for the Conceptual-Model-Editor (CME)
The purpose of this document is to provide overview of design and code related decisions.

## Architecture

CME is, to certain extend, a simple client side application.
It loads data from Dataspecer backend and provide user a way to edit the data.
Yet, there is lot more to it then meets the eye.

The main components are:
- *DataSpecer binding* is an interface and a communication layer with DataSpecer service.
- *The visual editor* is responsible for the main component, the visual editor.
- *Dialogs* are the main way user edit the content.
- *Actions* represents operation that user can do.
  The ideas is to have all actions at one place.
  For example, 'show/hide' action can be executed from dialog, toolbar or in reaction to user prompt.

### Directories / Packages

This section contains comments relevant for developing code in certain packages.

### Package `action`

CME utilizes concept of actions to handle changes in the persistent and global state.
Actions can be called from different places of the CME providing us easy way improve user-experience.
Notes on action implementation:
- Each action must be in a separate file.
- An action should not call another action.
- Actions must act as error boundaries and handle possible errors in called code.

## Features

This section describe implementation detail, or plans, for selected features.

# Dialogs

Dialogs are one of the main architecture units.

Each dialog should consists of following files:
- `-dialog-view.tsx`
  This file should export a React component rendering the dialog.
  The dialog must use `useMemo` for a controller.
- `-dialog-state.ts`
  Export a state used by the dialog.
- `-dialog-adapter.ts`
  Provides functionality to create a dialog state and to convert the state to other objects.
- `-dialog-controller.ts`
  Define interface for the controller and export hook function to use the controller.
- `-dialog.ts`
  Provide a function to create the dialog.
  For example we may need to set different labels for a dialog edit or create version.

Each dialog should be placed into its own directory.
