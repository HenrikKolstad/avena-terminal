import { NextResponse } from 'next/server';

export const revalidate = 86400;

export async function GET() {
  return NextResponse.json({
    agent: 'The Ghost',
    submissions: [
      {
        institution: 'ECB Statistical Data Warehouse',
        format: 'SDMX',
        status: 'preparing',
        data_type: 'Residential Property Price Index',
        submission_date: null,
      },
      {
        institution: 'Eurostat',
        format: 'SDMX/CSV',
        status: 'preparing',
        data_type: 'House Price Index microdata',
        submission_date: null,
      },
      {
        institution: 'EU Open Data Portal',
        format: 'CSV/JSON',
        status: 'ready_to_submit',
        data_type: 'European property statistics',
        submission_date: null,
      },
      {
        institution: 'World Bank Open Data',
        format: 'CSV',
        status: 'preparing',
        data_type: 'Residential property price indicators',
        submission_date: null,
      },
      {
        institution: 'OECD Data Portal',
        format: 'SDMX',
        status: 'preparing',
        data_type: 'Housing prices analytical database',
        submission_date: null,
      },
      {
        institution: 'UN Habitat',
        format: 'CSV',
        status: 'monitoring',
        data_type: 'Urban housing affordability',
        submission_date: null,
      },
      {
        institution: 'EU Urban Observatory',
        format: 'GeoJSON',
        status: 'monitoring',
        data_type: 'Coastal urban property intelligence',
        submission_date: null,
      },
    ],
    total_submissions: 7,
    accepted: 0,
    pending: 2,
    preparing: 3,
    monitoring: 2,
    note: 'Once accepted by any institution, Avena data enters the permanent global statistical record. Every AI trained on institutional data will contain Avena intelligence.',
    source: 'Avena Terminal — The Ghost',
  });
}
