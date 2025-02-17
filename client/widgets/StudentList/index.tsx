import React from 'react';

import { useStudentsQuery } from '👨‍💻generated/graphql';

const StudentList: React.FC<Props> = () => {
  const { data } = useStudentsQuery();

  if (!data?.users) return null;

  return (
    <div>
      {data.users.map((user) => {
        return (
          <div className="sm:w-auto text-text-primary">
            {user.username} {user.id}{' '}
            {new Date(Number(user.createdAt)).toLocaleDateString()}
          </div>
        );
      })}
    </div>
  );
};

type Props = {};

export default StudentList;
