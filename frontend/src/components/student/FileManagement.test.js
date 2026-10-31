import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FileManagement from './FileManagement';
import { uploadProjectFile } from '../../services/authService';

jest.mock('../../services/authService', () => ({
  uploadProjectFile: jest.fn(),
  downloadProjectFile: jest.fn()
}));

afterEach(() => {
  jest.clearAllMocks();
});

test('keeps the selected file available when metadata persistence fails', async () => {
  const onFilesUpdate = jest.fn().mockResolvedValue(false);
  const originalAlert = window.alert;
  window.alert = jest.fn();

  try {
    const { container } = render(
      <FileManagement
        projectId="PROJECT-1"
        projectLeadId="STU001"
        currentUserId="STU001"
        teamMembers={[]}
        projectFiles={[]}
        onFilesUpdate={onFilesUpdate}
        projectName="Test project"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ upload file/i }));
    const file = new File(['%PDF-1.7\nfile contents\n%%EOF'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/description\/version notes/i), { target: { value: 'Initial version' } });
    fireEvent.click(screen.getByRole('button', { name: /^upload file$/i }));

    await waitFor(() => expect(uploadProjectFile).toHaveBeenCalled());
    await waitFor(() => expect(onFilesUpdate).toHaveBeenCalled());
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText(/description\/version notes/i)).toHaveValue('Initial version');
    expect(screen.queryByRole('heading', { name: 'report.pdf' })).not.toBeInTheDocument();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('could not be saved'));
  } finally {
    window.alert = originalAlert;
  }
});

test('prevents duplicate file uploads while the first request is pending', async () => {
  let finishUpload;
  uploadProjectFile.mockImplementation(() => new Promise((resolve) => {
    finishUpload = resolve;
  }));

  const { container } = render(
    <FileManagement
      projectId="PROJECT-1"
      projectLeadId="STU001"
      currentUserId="STU001"
      teamMembers={[]}
      projectFiles={[]}
      onFilesUpdate={jest.fn().mockResolvedValue(undefined)}
      projectName="Test project"
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /\+ upload file/i }));
  const file = new File(['%PDF-1.7\nfile contents\n%%EOF'], 'report.pdf', { type: 'application/pdf' });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText(/description\/version notes/i), { target: { value: 'Initial version' } });

  const form = container.querySelector('form.modal-card');
  fireEvent.submit(form);
  fireEvent.submit(form);

  expect(uploadProjectFile).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent(/uploading file/i);

  await act(async () => {
    finishUpload();
  });

  await waitFor(() => expect(screen.queryByRole('heading', { name: /upload project file/i })).not.toBeInTheDocument());
});
