import { gql } from 'graphql-request'

export const INSERT_BOOKING = gql`
  mutation InsertBooking(
    $user_id: uuid!
    $vehicle_id: uuid!
    $start_date: date!
    $end_date: date!
    $total_amount: numeric!
    $status: String!
  ) {
    insert_bookings_one(
      object: {
        user_id: $user_id
        vehicle_id: $vehicle_id
        start_date: $start_date
        end_date: $end_date
        total_amount: $total_amount
        status: $status
      }
    ) {
      id
      status
      created_at
    }
  }
`

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($id: uuid!, $status: String!) {
    update_bookings_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
      id
      status
    }
  }
`
